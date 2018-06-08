
importScripts('bigint.js', 'hexdec.js', 'Combinatorics.js', 'secret-sharing.js');

function assembleShare(decInput, share){
  return hexdec.decToHex(bigInt(share).add(decInput).toString()).replace('0x', '');
}

onmessage = function(e){
  var data = e.data;
  var guesses = 0;
  var sharePermutations = Combinatorics.permutation(data.shares, data.payload.threshold);
  var found;
  sharePermutations.find(shareSet => {
    var shares = data.inputs.map((word, i) => assembleShare(word, shareSet[i]));
    secret = secrets.combine(shares);
    guesses++;
    if (secret === data.payload.key) {
      postMessage({
        id: data.id,
        guesses: guesses,
        secret: secret
      });
      self.terminate();
    }
  });
  postMessage({
    id: data.id,
    guesses: guesses
  });
}