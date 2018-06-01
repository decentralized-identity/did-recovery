
importScripts('subworkers.js');
importScripts('bigint.js', 'hexdec.js', 'Combinatorics.js', 'secret-sharing.js');

function assembleShare(decInput, share){
  return hexdec.decToHex(bigInt(share).add(decInput).toString()).replace('0x', '');
}

onmessage = function(e) {
  if (e.data.type == 'inputs') iterateInputs(e.data);
  else if (e.data.type == 'shares') iterateShares(e.data);
}

function iterateInputs(data){

  var workers = {};
  var workerID = 0;
  var workerCount = 0;
  var workerLimit = 10;
  var secretFound = false;
  var start = new Date().getTime();
  var shares = data.payload.shares.map(share => hexdec.hexToDec(share.data));
  var inputs = data.inputs.map(input => hexdec.wordToDec(input.toLowerCase()));
  var inputCombinations = Combinatorics.combination(inputs, data.payload.threshold);

  function fireShareWorker(inputSet){
    let worker = new Worker('worker.js');
    workerCount++;
    workers[workerID++] = worker;
    worker.onmessage = workerResponse;
    worker.postMessage({
      type: 'shares',
      id: workerID,
      inputs: inputSet,
      payload: data.payload,
      shares: shares
    });
  }

  function workerResponse(e){
    var secret = e.data.secret;
    if (secret){
      secretFound = true;
      for (let z in workers) workers[z].terminate();
      postMessage({
        secret: secret,
        workers: workerID,
        duration: (new Date().getTime() - start) / 1000
      });
    }
    else if (!secretFound) {
      workerCount--;
      workers[e.data.id].terminate();
      delete workers[e.data.id];
      let inputSet = inputCombinations.next();
      if (inputSet) fireShareWorker(inputSet);
      else if (!workerCount) postMessage({
        workers: workerID,
        duration: (new Date().getTime() - start) / 1000
      });
    }
  }

  while (workerCount < workerLimit) {
    let inputSet = inputCombinations.next();
    if (inputSet) fireShareWorker(inputSet);
  }
}

function iterateShares(data){
  var sharePermutations = Combinatorics.permutation(data.shares, data.payload.threshold);
  sharePermutations.find(shareSet => {
    var shares = data.inputs.map((word, i) => assembleShare(word, shareSet[i]));
    secret = secrets.combine(shares);
    if (secret === data.payload.key) {
      postMessage({
        id: data.id,
        secret: secret
      });
      return true;
    }
  });
  postMessage({
    id: data.id
  });
}