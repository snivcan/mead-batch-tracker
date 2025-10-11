import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const BATCHES_DIR = path.join(__dirname, 'batches');

// Middleware
app.use(cors());
app.use(express.json());

// Ensure batches directory exists
async function ensureBatchesDir() {
    try {
        await fs.access(BATCHES_DIR);
    } catch {
        await fs.mkdir(BATCHES_DIR, { recursive: true });
    }
}

// Get all batches
app.get('/api/batches', async (req, res) => {
    try {
        await ensureBatchesDir();
        const files = await fs.readdir(BATCHES_DIR);
        const batchFiles = files.filter(f => f.endsWith('.json'));

        const batches = await Promise.all(
            batchFiles.map(async (file) => {
                const content = await fs.readFile(path.join(BATCHES_DIR, file), 'utf-8');
                return JSON.parse(content);
            })
        );

        // Sort by start date, newest first
        batches.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        res.json(batches);
    } catch (error) {
        console.error('Error reading batches:', error);
        res.status(500).json({ error: 'Failed to read batches' });
    }
});

// Get single batch
app.get('/api/batches/:id', async (req, res) => {
    try {
        const filePath = path.join(BATCHES_DIR, `batch-${req.params.id}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        res.json(JSON.parse(content));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Batch not found' });
        } else {
            console.error('Error reading batch:', error);
            res.status(500).json({ error: 'Failed to read batch' });
        }
    }
});

// Create new batch
app.post('/api/batches', async (req, res) => {
    try {
        await ensureBatchesDir();
        const batch = req.body;
        const filePath = path.join(BATCHES_DIR, `batch-${batch.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(batch, null, 2));
        res.status(201).json(batch);
    } catch (error) {
        console.error('Error creating batch:', error);
        res.status(500).json({ error: 'Failed to create batch' });
    }
});

// Update batch
app.put('/api/batches/:id', async (req, res) => {
    try {
        const filePath = path.join(BATCHES_DIR, `batch-${req.params.id}.json`);
        const batch = req.body;
        await fs.writeFile(filePath, JSON.stringify(batch, null, 2));
        res.json(batch);
    } catch (error) {
        console.error('Error updating batch:', error);
        res.status(500).json({ error: 'Failed to update batch' });
    }
});

// Delete batch
app.delete('/api/batches/:id', async (req, res) => {
    try {
        const filePath = path.join(BATCHES_DIR, `batch-${req.params.id}.json`);
        await fs.unlink(filePath);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting batch:', error);
        res.status(500).json({ error: 'Failed to delete batch' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on ${PORT}`);
    console.log(`Batches stored in: ${BATCHES_DIR}`);
});

