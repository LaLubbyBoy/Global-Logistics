import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'tracking.db');
const db = new Database(dbPath);

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tracking_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    delivery_location TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    package_description TEXT NOT NULL,
    package_weight TEXT NOT NULL,
    package_value TEXT NOT NULL,
    date_registered TEXT NOT NULL,
    estimated_delivery_date TEXT NOT NULL,
    delivery_status TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id)
  );
`);

// Seed default admin if none exists
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
if (adminCount.count === 0) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('password123', salt);
  db.prepare('INSERT INTO admins (username, password_hash, email) VALUES (?, ?, ?)').run(
    'admin',
    hash,
    'admin@globalexpress.com'
  );
  console.log('Default admin seeded: username "admin", password "password123"');
}

// Seed sample tracking record if none exists
const recordCount = db.prepare('SELECT COUNT(*) as count FROM tracking_records').get() as { count: number };
if (recordCount.count === 0) {
  const sampleCode = 'TRK-2026-94821037';
  db.prepare(`
    INSERT INTO tracking_records (
      tracking_code, customer_name, customer_phone, customer_email,
      delivery_location, delivery_address, package_description,
      package_weight, package_value, date_registered, estimated_delivery_date,
      delivery_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sampleCode,
    'Sarah Jenkins',
    '+1 (555) 234-5678',
    'sarah.j@example.com',
    'New York, NY, USA',
    '742 Evergreen Terrace, Suite 4B, New York, NY 10001',
    'High-end Electronics & Laptop',
    '3.2 kg',
    '$1,450.00',
    new Date().toISOString().split('T')[0],
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    'In Transit',
    'Package cleared customs and is out for sorting.'
  );
  console.log(`Sample tracking record seeded: ${sampleCode}`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple auth middleware from Authorization Bearer or custom header
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];
    const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as { admin_id: number } | undefined;
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    }
    const admin = db.prepare('SELECT id, username, email FROM admins WHERE id = ?').get(session.admin_id);
    if (!admin) {
      return res.status(401).json({ error: 'Unauthorized: Admin not found' });
    }
    (req as any).admin = admin;
    next();
  };

  // --- AUTH API ---
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const admin = db.prepare('SELECT * FROM admins WHERE username = ? OR email = ?').get(username, username) as any;
      if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Generate session token
      const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      db.prepare('INSERT INTO sessions (token, admin_id) VALUES (?, ?)').run(token, admin.id);

      res.json({
        success: true,
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAdmin, (req, res) => {
    res.json({ admin: (req as any).admin });
  });

  // --- PUBLIC TRACKING API ---
  app.get('/api/track/:code', (req, res) => {
    try {
      const code = req.params.code.trim();
      const record = db.prepare('SELECT * FROM tracking_records WHERE tracking_code = ?').get(code);
      if (!record) {
        return res.status(404).json({ error: 'Tracking code not found. Please check your tracking number and try again.' });
      }
      res.json({ record });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ADMIN TRACKING & DASHBOARD API ---
  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    try {
      const total = (db.prepare('SELECT COUNT(*) as count FROM tracking_records').get() as any).count;
      const inTransit = (db.prepare("SELECT COUNT(*) as count FROM tracking_records WHERE delivery_status = 'In Transit'").get() as any).count;
      const delivered = (db.prepare("SELECT COUNT(*) as count FROM tracking_records WHERE delivery_status = 'Delivered'").get() as any).count;
      const pending = (db.prepare("SELECT COUNT(*) as count FROM tracking_records WHERE delivery_status IN ('Registered', 'Processing', 'Out for Delivery', 'On Hold')").get() as any).count;

      const recentRecords = db.prepare('SELECT * FROM tracking_records ORDER BY created_at DESC LIMIT 5').all();

      res.json({
        stats: { total, inTransit, delivered, pending },
        recentRecords,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/records', requireAdmin, (req, res) => {
    try {
      const { search } = req.query;
      let query = 'SELECT * FROM tracking_records';
      let params: any[] = [];

      if (search && typeof search === 'string' && search.trim() !== '') {
        const term = `%${search.trim()}%`;
        query += ' WHERE tracking_code LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ?';
        params = [term, term, term, term];
      }

      query += ' ORDER BY created_at DESC';
      const records = db.prepare(query).all(...params);
      res.json({ records });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/records', requireAdmin, (req, res) => {
    try {
      const {
        customer_name,
        customer_phone,
        customer_email,
        delivery_location,
        delivery_address,
        package_description,
        package_weight,
        package_value,
        date_registered,
        estimated_delivery_date,
        delivery_status,
        notes,
      } = req.body;

      if (!customer_name || !customer_phone || !delivery_location || !package_description) {
        return res.status(400).json({ error: 'Missing required shipment information' });
      }

      // Generate unique tracking code: TRK-2026-XXXXXXXX
      let tracking_code = '';
      let exists = true;
      while (exists) {
        const randomNum = Math.floor(10000000 + Math.random() * 90000000);
        tracking_code = `TRK-2026-${randomNum}`;
        const check = db.prepare('SELECT id FROM tracking_records WHERE tracking_code = ?').get(tracking_code);
        if (!check) {
          exists = false;
        }
      }

      const regDate = date_registered || new Date().toISOString().split('T')[0];
      const estDate = estimated_delivery_date || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
      const status = delivery_status || 'Registered';

      const stmt = db.prepare(`
        INSERT INTO tracking_records (
          tracking_code, customer_name, customer_phone, customer_email,
          delivery_location, delivery_address, package_description,
          package_weight, package_value, date_registered, estimated_delivery_date,
          delivery_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        tracking_code,
        customer_name,
        customer_phone,
        customer_email || '',
        delivery_location,
        delivery_address || '',
        package_description,
        package_weight || '1.0 kg',
        package_value || '$100.00',
        regDate,
        estDate,
        status,
        notes || ''
      );

      const newRecord = db.prepare('SELECT * FROM tracking_records WHERE id = ?').get(info.lastInsertRowid);
      res.status(201).json({ success: true, record: newRecord });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/records/:id', requireAdmin, (req, res) => {
    try {
      const record = db.prepare('SELECT * FROM tracking_records WHERE id = ?').get(req.params.id);
      if (!record) {
        return res.status(404).json({ error: 'Record not found' });
      }
      res.json({ record });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/records/:id', requireAdmin, (req, res) => {
    try {
      const id = req.params.id;
      const {
        customer_name,
        customer_phone,
        customer_email,
        delivery_location,
        delivery_address,
        package_description,
        package_weight,
        package_value,
        date_registered,
        estimated_delivery_date,
        delivery_status,
        notes,
      } = req.body;

      const existing = db.prepare('SELECT * FROM tracking_records WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({ error: 'Record not found' });
      }

      db.prepare(`
        UPDATE tracking_records SET
          customer_name = COALESCE(?, customer_name),
          customer_phone = COALESCE(?, customer_phone),
          customer_email = COALESCE(?, customer_email),
          delivery_location = COALESCE(?, delivery_location),
          delivery_address = COALESCE(?, delivery_address),
          package_description = COALESCE(?, package_description),
          package_weight = COALESCE(?, package_weight),
          package_value = COALESCE(?, package_value),
          date_registered = COALESCE(?, date_registered),
          estimated_delivery_date = COALESCE(?, estimated_delivery_date),
          delivery_status = COALESCE(?, delivery_status),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        customer_name,
        customer_phone,
        customer_email,
        delivery_location,
        delivery_address,
        package_description,
        package_weight,
        package_value,
        date_registered,
        estimated_delivery_date,
        delivery_status,
        notes,
        id
      );

      const updated = db.prepare('SELECT * FROM tracking_records WHERE id = ?').get(id);
      res.json({ success: true, record: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/records/:id', requireAdmin, (req, res) => {
    try {
      const id = req.params.id;
      const existing = db.prepare('SELECT * FROM tracking_records WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({ error: 'Record not found' });
      }
      db.prepare('DELETE FROM tracking_records WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Setup Vite middleware for development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  app.get('/admin.html', async (req, res, next) => {
    try {
      const url = '/admin.html';
      let template = fs.readFileSync(path.resolve(__dirname, 'admin.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      next(e);
    }
  });

  app.get('/', async (req, res, next) => {
    try {
      const url = '/index.html';
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      next(e);
    }
  });

  app.use(vite.middlewares);

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
