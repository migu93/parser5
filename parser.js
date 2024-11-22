const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

/**
 * Задержка выполнения на указанное количество миллисекунд.
 * @param {number} ms - Время задержки в миллисекундах.
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Парсит посты с комментариями с указанной страницы ВКонтакте.
 * @param {string} url - URL страницы.
 * @returns {Promise<Array>} Массив объектов с постами и комментариями.
 */
const parseVkPosts = async (url) => {
    try {
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

            posts.push({
                id: postId,
                author: postAuthor,
                date: postDate,
                text: postText,
                images: images,
                comments: comments
            });

            // Отображение прогресса
            console.log(`(${i + 1}/${totalPosts}) Пост "${postText.substring(0, 30)}..." успешно обработан`);

            // Задержка перед следующим постом
            if (i < totalPosts - 1) {
                await delay(5000); // 10 секунд
            }
        }

        return posts;
    } catch (error) {
        console.error('Ошибка при парсинге:', error.message);
        return [];
    }
};

module.exports = { parseVkPosts };
