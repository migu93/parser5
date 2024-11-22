const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const natural = require('natural'); // Для обработки естественного языка

/**
 * Задержка выполнения на указанное количество миллисекунд.
 * @param {number} ms - Время задержки в миллисекундах.
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Проверяет, содержит ли текст слова, связанные с ключевой темой.
 * @param {string} text - Текст для проверки.
 * @param {Array<string>} keywords - Список ключевых слов.
 * @returns {boolean} - True, если текст связан с ключевой темой.
 */
const isRelevantText = (text, keywords) => {
    const tokenizer = new natural.WordTokenizer(); // Токенизатор слов
    const stemmer = natural.PorterStemmerRu; // Стеммер для русского языка
    const tokens = tokenizer.tokenize(text.toLowerCase()); // Разделяем текст на слова и приводим к нижнему регистру
    const stems = tokens.map(word => stemmer.stem(word)); // Приводим каждое слово к основе

    // Проверяем, есть ли пересечения основ текста с основами ключевых слов
    return keywords.some(keyword => {
        const keywordStem = stemmer.stem(keyword.toLowerCase());
        return stems.includes(keywordStem);
    });
};

/**
 * Проверяет, является ли пост релевантным, анализируя текст поста и комментарии.
 * @param {string} postText - Текст поста.
 * @param {Array} comments - Массив комментариев.
 * @param {Array<string>} keywords - Список ключевых слов.
 * @returns {boolean} - True, если пост или его комментарии связаны с ключевой темой.
 */
const isRelevantPost = (postText, comments, keywords) => {
    // Проверяем текст поста
    if (isRelevantText(postText, keywords)) {
        return true;
    }

    // Проверяем текст комментариев
    for (const comment of comments) {
        if (isRelevantText(comment.text, keywords)) {
            return true;
        }
    }

    return false;
};

/**
 * Парсит посты с комментариями с указанной страницы ВКонтакте.
 * @param {string} url - URL страницы.
 * @returns {Promise<Array>} Массив объектов с постами и комментариями.
 */
const parseVkPosts = async (url) => {
    try {
        // Список ключевых слов
        const keywords = [
            "озеленение", "посадка деревьев", "зелёные насаждения", "садоводство",
            "вырубка", "снос деревьев", "уничтожение зелени",
            "парк", "сквер", "аллея", "ландшафтный дизайн",
            "реконструкция", "благоустройство", "контракт", "дружба"
        ];

        // Получение HTML страницы
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            responseEncoding: 'binary',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        });

        // Декодирование в windows-1251
        const decodedData = iconv.decode(response.data, 'windows-1251');

        // Загрузка в Cheerio
        const $ = cheerio.load(decodedData);

        // Сбор постов
        const posts = [];
        const postElements = $('.post');
        const totalPosts = postElements.length;

        for (let i = 0; i < totalPosts; i++) {
            const element = postElements[i];
            const post = $(element);
            const postId = post.attr('id');
            const postText = post.find('.wall_post_text').text().trim();
            const postDate = post.find('.post_header .rel_date').text().trim();
            const postAuthor = post.find('.post_header .author').text().trim();

            // Извлечение ссылок на изображения
            const images = [];
            post.find('.page_post_sized_thumbs a').each((i, el) => {
                const imageUrl = $(el).attr('href');
                images.push(imageUrl);
            });

            // Парсинг комментариев
            const comments = [];
            post.find('.wall_reply_text').each((i, el) => {
                const commentBlock = $(el);

                // Текст комментария
                const commentText = commentBlock
                    .contents()
                    .filter((_, content) => content.type === 'text')
                    .text()
                    .trim();

                // Эмодзи комментария
                const emojis = [];
                commentBlock.find('img.emoji').each((j, emoji) => {
                    const emojiAlt = $(emoji).attr('alt'); // Альтернативный текст эмодзи
                    emojis.push(emojiAlt);
                });

                comments.push({
                    text: commentText,
                    emojis: emojis
                });
            });

            // Проверяем, является ли пост релевантным
            if (isRelevantPost(postText, comments, keywords)) {
                posts.push({
                    id: postId,
                    author: postAuthor,
                    date: postDate,
                    text: postText,
                    images: images,
                    comments: comments
                });

                // Отображение прогресса
                console.log(`(${i + 1}/${totalPosts}) Пост "${postText.substring(0, 30)}..." добавлен в результат`);
            } else {
                console.log(`(${i + 1}/${totalPosts}) Пост "${postText.substring(0, 30)}..." не соответствует критериям`);
            }

            // Задержка перед следующим постом
            if (i < totalPosts - 1) {
                await delay(10000); // 10 секунд
            }
        }

        return posts;
    } catch (error) {
        console.error('Ошибка при парсинге:', error.message);
        return [];
    }
};

module.exports = { parseVkPosts };
