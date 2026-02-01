const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

const INDEX_FILE = path.join(__dirname, 'index.json');

app.post('/api/index', (req, res) => {
    const { chars, page } = req.body;

    if (!Number.isInteger(page) || page < 1) {
        return res.status(400).json({ error: '请输入有效的页码' });
    }

    const charArray = chars.split(/\s+/);
    console.log(`accept chars: ${chars}`);
    for (const char of charArray) {
        if (!char || typeof char !== 'string') {
            return res.status(400).json({ error: '请输入正确的格式' });
        }
    }

    try {
        let index = {};
        if (fs.existsSync(INDEX_FILE)) {
            const content = fs.readFileSync(INDEX_FILE, 'utf8');
            index = JSON.parse(content);
        }

        // Add or update entry
        for (const char of charArray) {
            console.log(`----adding char: ${char}`);
            index[char] = page;
        }

        fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
        res.json({ success: true, index });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '保存失败' });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running at http://:${process.env.PORT || 3000}`);
});