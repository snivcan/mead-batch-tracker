const API_BASE_URL = 'http://192.168.2.11:3001/api';

export const batchAPI = {
    // Get all batches
    async getAllBatches() {
        const response = await fetch(`${API_BASE_URL}/batches`);
        if (!response.ok) throw new Error('Failed to fetch batches');
        return response.json();
    },

    // Get a single batch
    async getBatch(id) {
        const response = await fetch(`${API_BASE_URL}/batches/${id}`);
        if (!response.ok) throw new Error('Failed to fetch batch');
        return response.json();
    },

    // Create a new batch
    async createBatch(batch) {
        const response = await fetch(`${API_BASE_URL}/batches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch)
        });
        if (!response.ok) throw new Error('Failed to create batch');
        return response.json();
    },

    // Update a batch
    async updateBatch(id, batch) {
        const response = await fetch(`${API_BASE_URL}/batches/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch)
        });
        if (!response.ok) throw new Error('Failed to update batch');
        return response.json();
    },

    // Delete a batch
    async deleteBatch(id) {
        const response = await fetch(`${API_BASE_URL}/batches/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete batch');
        return response.json();
    }
};

