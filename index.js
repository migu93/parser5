const express = require('express');
const { parseVkPosts } = require('./parser');

const app = express();
const PORT = 3000;

// Эндпоинт для парсинга
app.get('/parse', async (req, res) => {
    const url = req.query.url; // Получаем URL из query параметров

    if (!url) {
        return res.status(400).json({ error: 'URL не указан' });
    }

    try {
        const posts = await parseVkPosts(url);
        res.json(posts); // Возвращаем посты в формате JSON
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
