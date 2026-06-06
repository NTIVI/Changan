const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Database Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Setup database tables on startup
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id VARCHAR(255) PRIMARY KEY,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone VARCHAR(50),
        date VARCHAR(50),
        time VARCHAR(50),
        reason VARCHAR(255),
        custom_reason VARCHAR(255),
        serviced_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(255) PRIMARY KEY,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        passport_number VARCHAR(255),
        vin_code VARCHAR(255),
        virtual_phone VARCHAR(255),
        country VARCHAR(255),
        pdf_file_name VARCHAR(255),
        serviced_by VARCHAR(255),
        has_passport_photo BOOLEAN,
        has_vin_photo BOOLEAN,
        has_pdf_file BOOLEAN,
        has_num_photo BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS confirmed (
        id VARCHAR(255) PRIMARY KEY,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone VARCHAR(50),
        date VARCHAR(50),
        time VARCHAR(50),
        reason VARCHAR(255),
        passport_number VARCHAR(255),
        vin_code VARCHAR(255),
        virtual_phone VARCHAR(255),
        country VARCHAR(255),
        pdf_file_name VARCHAR(255),
        serviced_by VARCHAR(255),
        confirmed_at VARCHAR(255),
        source VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Run Alter table scripts to add file data columns if they don't exist
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS passport_file_data TEXT;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS passport_file_name TEXT;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS vin_file_data TEXT;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS vin_file_name TEXT;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS pdf_file_data TEXT;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS pdf_file_name TEXT;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS num_file_data TEXT;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS num_file_name TEXT;

      ALTER TABLE confirmed ADD COLUMN IF NOT EXISTS passport_file_data TEXT;
      ALTER TABLE confirmed ADD COLUMN IF NOT EXISTS passport_file_name TEXT;
      ALTER TABLE confirmed ADD COLUMN IF NOT EXISTS vin_file_data TEXT;
      ALTER TABLE confirmed ADD COLUMN IF NOT EXISTS vin_file_name TEXT;
      ALTER TABLE confirmed ADD COLUMN IF NOT EXISTS pdf_file_data TEXT;
      ALTER TABLE confirmed ADD COLUMN IF NOT EXISTS pdf_file_name TEXT;
      ALTER TABLE confirmed ADD COLUMN IF NOT EXISTS num_file_data TEXT;
      ALTER TABLE confirmed ADD COLUMN IF NOT EXISTS num_file_name TEXT;
    `);
    console.log('Database tables verified/created and schema updated successfully.');
  } catch (err) {
    console.error('Error initializing database tables:', err);
  }
};

initDb();

// Mappers
const mapWaitlistRow = (row) => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  date: row.date,
  time: row.time,
  reason: row.reason,
  customReason: row.custom_reason,
  servicedBy: row.serviced_by
});

const mapDocRow = (row) => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  passportNumber: row.passport_number,
  vinCode: row.vin_code,
  virtualPhone: row.virtual_phone,
  country: row.country,
  pdfFileName: row.pdf_file_name,
  servicedBy: row.serviced_by,
  hasPassportPhoto: row.has_passport_photo,
  hasVinPhoto: row.has_vin_photo,
  hasPdfFile: row.has_pdf_file,
  hasNumPhoto: row.has_num_photo,
  passportFileData: row.passport_file_data,
  passportFileName: row.passport_file_name,
  vinFileData: row.vin_file_data,
  vinFileName: row.vin_file_name,
  pdfFileData: row.pdf_file_data,
  numFileData: row.num_file_data,
  numFileName: row.num_file_name
});

const mapConfirmedRow = (row) => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  date: row.date,
  time: row.time,
  reason: row.reason,
  passportNumber: row.passport_number,
  vinCode: row.vin_code,
  virtualPhone: row.virtual_phone,
  country: row.country,
  pdfFileName: row.pdf_file_name,
  servicedBy: row.serviced_by,
  confirmedAt: row.confirmed_at,
  source: row.source,
  passportFileData: row.passport_file_data,
  passportFileName: row.passport_file_name,
  vinFileData: row.vin_file_data,
  vinFileName: row.vin_file_name,
  pdfFileData: row.pdf_file_data,
  numFileData: row.num_file_data,
  numFileName: row.num_file_name
});

// API Routes

// 1. Waitlist CRUD
app.get('/api/waitlist', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM waitlist ORDER BY date ASC, time ASC');
    res.json(rows.map(mapWaitlistRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching waitlist' });
  }
});

app.post('/api/waitlist', async (req, res) => {
  const { id, firstName, lastName, phone, date, time, reason, customReason, servicedBy } = req.body;
  try {
    const query = `
      INSERT INTO waitlist (id, first_name, last_name, phone, date, time, reason, custom_reason, serviced_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [id, firstName, lastName, phone, date, time, reason, customReason, servicedBy]);
    res.status(201).json(mapWaitlistRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving waitlist entry' });
  }
});

app.put('/api/waitlist/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, date, time, reason, customReason, servicedBy } = req.body;
  try {
    const query = `
      UPDATE waitlist
      SET first_name = $1, last_name = $2, phone = $3, date = $4, time = $5, reason = $6, custom_reason = $7, serviced_by = $8
      WHERE id = $9
      RETURNING *
    `;
    const { rows } = await pool.query(query, [firstName, lastName, phone, date, time, reason, customReason, servicedBy, id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(mapWaitlistRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating waitlist entry' });
  }
});

app.delete('/api/waitlist/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM waitlist WHERE id = $1', [id]);
    res.json({ message: 'Waitlist record deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting waitlist entry' });
  }
});

// 2. Documents CRUD
app.get('/api/documents', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
    res.json(rows.map(mapDocRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching documents' });
  }
});

app.post('/api/documents', async (req, res) => {
  const {
    id, firstName, lastName, passportNumber, vinCode, virtualPhone, country, pdfFileName, servicedBy,
    hasPassportPhoto, hasVinPhoto, hasPdfFile, hasNumPhoto,
    passportFileData, passportFileName, vinFileData, vinFileName, pdfFileData, numFileData, numFileName
  } = req.body;
  try {
    const query = `
      INSERT INTO documents (
        id, first_name, last_name, passport_number, vin_code, virtual_phone, country, pdf_file_name, serviced_by,
        has_passport_photo, has_vin_photo, has_pdf_file, has_num_photo,
        passport_file_data, passport_file_name, vin_file_data, vin_file_name, pdf_file_data, num_file_data, num_file_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      id, firstName, lastName, passportNumber, vinCode, virtualPhone, country, pdfFileName, servicedBy,
      hasPassportPhoto, hasVinPhoto, hasPdfFile, hasNumPhoto,
      passportFileData, passportFileName, vinFileData, vinFileName, pdfFileData, numFileData, numFileName
    ]);
    res.status(201).json(mapDocRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving document entry' });
  }
});

app.put('/api/documents/:id', async (req, res) => {
  const { id } = req.params;
  const {
    firstName, lastName, passportNumber, vinCode, virtualPhone, country, pdfFileName, servicedBy,
    hasPassportPhoto, hasVinPhoto, hasPdfFile, hasNumPhoto,
    passportFileData, passportFileName, vinFileData, vinFileName, pdfFileData, numFileData, numFileName
  } = req.body;
  try {
    const query = `
      UPDATE documents
      SET first_name = $1, last_name = $2, passport_number = $3, vin_code = $4, virtual_phone = $5, country = $6, pdf_file_name = $7, serviced_by = $8,
          has_passport_photo = $9, has_vin_photo = $10, has_pdf_file = $11, has_num_photo = $12,
          passport_file_data = $13, passport_file_name = $14, vin_file_data = $15, vin_file_name = $16, pdf_file_data = $17,
          num_file_data = $18, num_file_name = $19
      WHERE id = $20
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      firstName, lastName, passportNumber, vinCode, virtualPhone, country, pdfFileName, servicedBy,
      hasPassportPhoto, hasVinPhoto, hasPdfFile, hasNumPhoto,
      passportFileData, passportFileName, vinFileData, vinFileName, pdfFileData, numFileData, numFileName, id
    ]);
    if (rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(mapDocRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating document entry' });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    res.json({ message: 'Document record deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting document entry' });
  }
});

// 3. Confirmed CRUD
app.get('/api/confirmed', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM confirmed ORDER BY created_at DESC');
    res.json(rows.map(mapConfirmedRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching confirmed clients' });
  }
});

app.post('/api/confirmed', async (req, res) => {
  const {
    id, firstName, lastName, phone, date, time, reason, passportNumber, vinCode, virtualPhone, country, pdfFileName,
    servicedBy, confirmedAt, source,
    passportFileData, passportFileName, vinFileData, vinFileName, pdfFileData, numFileData, numFileName
  } = req.body;
  try {
    const query = `
      INSERT INTO confirmed (
        id, first_name, last_name, phone, date, time, reason, passport_number, vin_code, virtual_phone, country, pdf_file_name,
        serviced_by, confirmed_at, source,
        passport_file_data, passport_file_name, vin_file_data, vin_file_name, pdf_file_data, num_file_data, num_file_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      id, firstName, lastName, phone, date, time, reason, passportNumber, vinCode, virtualPhone, country, pdfFileName,
      servicedBy, confirmedAt, source,
      passportFileData, passportFileName, vinFileData, vinFileName, pdfFileData, numFileData, numFileName
    ]);
    res.status(201).json(mapConfirmedRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving confirmed entry' });
  }
});

app.delete('/api/confirmed/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM confirmed WHERE id = $1', [id]);
    res.json({ message: 'Confirmed record deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting confirmed entry' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
