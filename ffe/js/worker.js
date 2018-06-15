
importScripts('bigint.js', 'hexdec.js', 'Combinatorics.js', 'secret-sharing.js');

function assembleShare(decInput, share){
  return hexdec.decToHex(bigInt(share).add(decInput).toString()).replace('0x', '');
}

onmessage = function(e){
  var data = e.data;
  var guesses = 0;
  var inputs = data.inputs;
  var key = data.payload.key;
  var sharePermutations = Combinatorics.permutation(data.shares, data.payload.threshold);
  sharePermutations.find(shareSet => {
    secret = secrets.combine(inputs.map((word, i) => assembleShare(word, shareSet[i])));
    guesses++;
    if (secret === key) {
      postMessage({
        id: data.id,
        guesses: guesses,
        secret: secret
      });
    }
  });
  postMessage({
    id: data.id,
    guesses: guesses
  });
}