
/*
  Notes: 

*/


const regexWordSplitter = /([\w+-]+)\s*/gm;

function wordsFromText(text){
  text.match(regexWordSplitter);
}

function isGenerating(){ return document.body.hasAttribute('generating') }

function toggleGenerator(on){
  if (on) {
    submit_generate.disabled = true;
    document.body.setAttribute('generating', '');
  }
  else {
    submit_generate.disabled = false;
    document.body.removeAttribute('generating');
  }
}

function getPassphrase(){
  return generate_form.elements.passphrase.value.trim().toLowerCase();
}

function renderTresholdCounter(){
  var threshold = generate_form.elements.threshold;
  threshold_counter.textContent = threshold.value + ' words out of ' + honey_words.words.length;
}

function renderHoneyWords(words){
  honey_words.words = words;
  var wordCount = words.length;
  if (wordCount > 2) {
    generate_form.elements.threshold.max = wordCount - 1;
    renderTresholdCounter();
  }
  honey_words.innerHTML = words.reduce((last, next) => {
    return last + `<span>${next}</span>`;
  }, '');
}

function filterPassphrase(){
  localStorage.passphrase = generate_form.elements.passphrase.value;
  return wretch('/api/wordfilter').json({
    factors: {
      phrase: getPassphrase()
    }
  }).post().json(json => {
    console.log(json);
    toggleGenerator();
    renderHoneyWords(json);
  }).catch(e => {

  });
}

document.addEventListener('DOMContentLoaded', function(){
  var phrase = localStorage.passphrase;
  if (phrase) generate_form.elements.passphrase.value = phrase;
  filterPassphrase();
})

var keyTimeout = null;
passphrase.addEventListener('keyup', function(e){
  clearTimeout(keyTimeout);
  keyTimeout = setTimeout(filterPassphrase, 750);
});

function generateShares(secret, threshold, factors){
  var payload = {};
  var key = secrets.str2hex(secret) || secrets.random(128);
  var shares = secrets.share(key, factors.length, threshold);
  payload.key = key;
  payload.shares = factors.map((obj, i) => {
    obj.data = hexdec.decToHex(bigInt(hexdec.hexToDec(shares[i])).minus(hexdec.wordToDec(obj.factor)).toString()).replace('0x', '')
    return obj;
  });
  return payload;
}

function assembleShare(factor, share){
  var decWord = hexdec.wordToDec(factor.toLowerCase());
  return hexdec.decToHex(bigInt(hexdec.hexToDec(share)).add(decWord).toString()).replace('0x', '');
}

generate_form.addEventListener('submit', function(e){

  e.preventDefault();
  
  if (isGenerating()) return;

  var words = honey_words.words;
  var factors = words.map(word => { return { factor: word, type: 'word'} })
  var shareCount = Number(factors && factors.length) || 0;
  var thresholdCount = Number(this.elements.threshold.value);

  if (shareCount > 3 && shareCount > thresholdCount) {
    
    //toggleGenerator(true);
    
    

    var payload = generateShares(this.elements.secret.value.trim(), thresholdCount, factors);

    localStorage.lastPayload = JSON.stringify(payload);

    result.innerHTML = payload.shares.reduce((last, share, i) => {
      return last + `<dd>
                      <data class="share-factor" type="${share.type}">${share.factor}</data>
                      <data class="share-data" value="${share.data}">${share.data}</data>
                    </dd>`;
    }, `<dt>Secret <i>hexadecimal</i></dt><dd><data value="${payload.key}">${payload.key}</data></dd><dt>Shares</dt>`);

    var comb = secrets.combine( [
      assembleShare(payload.shares[1].factor, payload.shares[1].data),
      assembleShare(payload.shares[3].factor, payload.shares[3].data),
      assembleShare(payload.shares[5].factor, payload.shares[5].data)
    ] );
    console.log( comb === payload.key  );
}

});

recovery_form.addEventListener('submit', function(e){

  e.preventDefault();

  if (isGenerating()) return;

  if (recover_text && recover_shares.value) {

  }
  else {

    var payload = JSON.parse(localStorage.lastPayload || null);
    if (recover_text.value && payload){

      toggleGenerator(true);

      var shareData = payload.shares.map(share => share.data);
      wretch('/api/wordfilter').json({
        factors: {
          phrase: recover_text.value
        }
      }).post().json(words => {
        console.log(words);
        toggleGenerator();
        var comb = secrets.combine(words.map((word, i) => {
          return assembleShare(word, payload.shares[i].data);
        }));
        var success = comb === payload.key;
        console.log(success);
        if (success) console.log(comb);
      }).catch(e => {
    
      });
      
    }
  }

});
