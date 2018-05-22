
const fs = require('fs');
const WordPOS = require('wordpos');

const Koa = require('koa');
const Router = require('koa-router');
const mount = require("koa-mount");
const static = require('koa-static');
const bodyParser = require('koa-body');

const app = new Koa();
const router = new Router();
const wordpos = new WordPOS();

router.get('/', async (ctx, next) => {
  ctx.type = 'html';
  ctx.body = fs.createReadStream('index.html');
  await next();
});

router.post('/api/wordfilter', async (ctx, next) => {
  console.log(ctx.request.body);
  var words = [];
  var json = ctx.request.body;
  if (json) {
    var phrase = json.factors.phrase;
    if (phrase) {
      var promises = [];
      phrase.trim().toLowerCase().match(/\w+/g).filter(function(word, i){
        promises.push(new Promise(function(resolve, reject) {
          wordpos.getPOS(word, results => {
            console.log(results.rest);
            if (results.nouns[0] || results.rest[0]) words[i] = word;
            resolve();
          });
        }));
      });
      await Promise.all(promises);
    }
  }
  ctx.response.body = words.filter(() => true);
  await next();
});

app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())
  .use(mount('/js', static('./js')))
  .use(mount('/images', static('./images')))

app.listen(3000, () => {
  console.log(`Your app is running on port 3000`);
});
