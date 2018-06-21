
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
  generate_form.elements.passphrase.value = localStorage.passphrase || '';
  generate_form.elements.secret.value = localStorage.secret || '';
  recover_text.value = localStorage.recover_text || '';
  filterPassphrase();
})

generate_form.elements.secret.addEventListener('blur', function(e){
  localStorage.secret = this.value;
});

recover_text.addEventListener('blur', function(e){
  localStorage.recover_text = this.value;
});


var keyTimeout = null;
passphrase.addEventListener('keyup', function(e){
  clearTimeout(keyTimeout);
  keyTimeout = setTimeout(filterPassphrase, 750);
});

function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateShares(secret, threshold, factors){
  var payload = {};
  var key = hexdec.wordToHex(secret) || secrets.random(128);
  var shares = secrets.share(key, factors.length, threshold);
  payload.key = key;
  payload.threshold = threshold;
  payload.shares = shuffleArray(factors.map((obj, i) => {
    obj.data = hexdec.decToHex(bigInt(hexdec.hexToDec(shares[i])).minus(hexdec.wordToDec(obj.factor)).toString()).replace('0x', '')
    return obj;
  }));

  
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

    console.log(payload.key);
  }

});

var workers = {};

function logResults(start, workerCount, guessCount, secret){
  console.log(`Tried ${ guessCount } guesses in ${ (new Date().getTime() - start) / 1000 } seconds using ${ workerCount } workers`);
  console.log(secret ? 'Secret found: ' + hexdec.hexToWord(secret) : 'Secret recovery failed');
}

function killWorkers(){
  for (let z in workers) workers[z].terminate();
  workers = {};
}

function attemptRecovery(inputs, payload){
  killWorkers();
  var workerID = 0;
  var workerCount = 0;
  var workerLimit = 2;
  var guessCount = 0;
  var secretFound = false;
  var start = new Date().getTime();
  var shares = payload.shares.map(share => hexdec.hexToDec(share.data));
  var inputs = inputs.map(input => hexdec.wordToDec(input.toLowerCase()));
  var inputCombinations = Combinatorics.combination(inputs, payload.threshold);
  var inputCombinationsReversed = Combinatorics.combination(inputs.reverse(), payload.threshold);

  function fireWorker(inputSet){
    let worker = new Worker('js/worker.js');
    workerCount++;
    workers[workerID++] = worker;
    worker.onmessage = workerResponse;
    worker.postMessage({
      id: workerID,
      inputs: inputSet,
      payload: payload,
      shares: shares
    });
  }

  function workerResponse(e){
    var secret = e.data.secret;
    guessCount += e.data.guesses;
    if (secret){
      secretFound = true;
      killWorkers();
      logResults(start, workerID, guessCount, secret);
    }
    else if (!secretFound) {
      workerCount--;
      workers[e.data.id].terminate();
      delete workers[e.data.id];
      let inputSet = inputCombinations.next();
      if (inputSet) fireShareWorker(inputSet);
      else if (!workerCount) logResults(start, workerID, guessCount);
    }
  }

  while (workerCount < workerLimit) {
    let inputSet = inputCombinations.next();
    if (inputSet) fireWorker(inputSet);
    let reverseInputSet = inputCombinationsReversed.next();
    if (reverseInputSet) fireWorker(reverseInputSet);
  }
}

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

        attemptRecovery(words, payload);

      }).catch(e => {
    
      });
      
    }
  }

});
