# Sweet Fuzzy Secrets

<center>Daniel Buchner</center>
<center>May 1, 2018</center>

### <center>Abstract</center>
Systems where users are responsible for ownership and management of sensitive data (e.g. private keys) have long suffered from a lack of human-friendly mechanisms of access, storage, and recovery. Existing solutions, such as Password-based Encryption (PBE), threshold secret sharing schemes (e.g. Shamir), and hardware factors, are all subject to negative tradeoffs in security and ease of use that degrade the ability of non-technical users to successfully perform. This paper introduces the possibility of a new scheme that may enable more human-friendly key management paradigms.

The scheme proposed in this paper seeks to provide secure storage and regeneration of sensitive data by allowing fuzzy recollection and recombination of an M threshold of user-selected human-friendly inputs, wherein recollection needn't precisely match the original set of N total human-friendly inputs. This scheme uses a simple format-preserving transform that merges a set of N human-friendly inputs with a matching number of threshold secret values (e.g. 32 byte hexidecimal strings) to generate share values that can only be effectively recombine when T threshold of N original human-friendly inputs are provided. Example: imagine being able to describe an experience from your life, for which you know intimate, secret aspects, and use that to secure a piece of sensitive data in a way that allows you to recollect the same experience with reasonable variability and still recover the data. That is but one example - this construction allows for almost any form of input to be used as a factor, including: user-meaningful passphrases, GPS locations, PIN numbers, biometric values, etc.

## Background & Inspiration

There are many ways to encrypt and secure data, but most have unfortunate tradeoffs that affect their security or ability to be used effectively by the vast majority of users. Many of the more human-friendly means of securing data involve physically hiding inputs (QR codes) or remembering abstract inputs (high-entropy passwords, mnemonic phrases, etc.) with exact precision. Additionally, the level of security most methods deliver is inverse to the level of difficulty they shoulder users with - high security that requires high user pain is not often a recipe for success.

The mechanism for fuzzy recombination of human-friendly inputs for the regeneration of sensitive data described in this paper draws from the cryptograpihic schemes, ideas, and learnings gathered from review of existing threshold secret constructions and papers on Honey Encryption by Jaeger, Ristenpart, Tang, Tyagi, Wang, Wen, and Zuo. [1] [2] [3].

**Honey Encryption** is a scheme first introduced by Juels and Ristenpart [4] that proposed a means to achieve security for low-entropy keys, even when an attacker has access to the ciphertext and can attempt to decrypt with all possible/probable keys. Honey Encryption (HE) does this by ensuring all plaintexts generated during a brute-force attack look plausible across a target distribution of expected outputs. Juels and Ristenpart also provided a framework for building HE schemes that composes a distribution-transforming encoder (DTE). A DTE is a form of randomized encoding scheme that is specifically constructed to output values in accordance with a target distribution of a given value type. Research of various Honey Encryption variants inspired the portion of the scheme outlined in this paper.

**Secret sharing** (also called secret splitting) refers to methods for distributing a secret amongst a group of participants or destinations, each of whom is allocated a share of the secret. The secret can be reconstructed only when a sufficient number, of possibly different types, of shares are combined together; individual shares are of no use on their own.

In one type of secret sharing scheme there is one dealer and n players. The dealer gives a share of the secret to the players, but only when specific conditions are fulfilled will the players be able to reconstruct the secret from their shares. The dealer accomplishes this by giving each player a share in such a way that any group of t (for threshold) or more players can together reconstruct the secret but no group of fewer than t players can. Such a system is called a (t, n)-threshold scheme (sometimes it is written as an (n, t)-threshold scheme). [5] Secret sharing was invented independently by Adi Shamir [6] and George Blakley [7] in 1979.

## Overview of the Construction

In order to ground ourselves in a use-case that illustrates the purpose, intent, and application of this encryption scheme, we will examine the case of a user-meaningful passphrase. We will assume the user desires to recover a secret with a range of fuzzy recollections of the original passphrase, and apply the proposed scheme to enable this.

To start, assume the user enters the following secret and passphrase:

Secret: `007`

Passphrase: `I sat next to Chef Morimoto at the bar in Cin Cin restaurant and got his autograph on a napkin. He was with the head chef from the restaurant he opened in Napa.`

In common PBE schemes, the passphrase above would need to be input exactly as originally entered, which is a significant barrier to effective use. While these schemes are useful in some cases, we seek a method that allows for fuzzy variability of input that still results in the recovery of the encrypted data. To do so, we'll need more than just a simple PBE scheme.

### Format-Preserving Transformation of Threshold Shares

To augment our example input, a passphrase, with the fuzzy recollection feature, we propose the following construction:

Assume the user's passphrase (above) is run through a well-known, standard filter that outputs an array of 12 significant input segments in accordance with an implementation-canonical dictionary: `['sat', 'next', 'chef', 'morimoto', 'bar', 'cin', 'restaurant', 'autograph', 'napkin', 'head', 'opened', 'napa']`

Next we use an implementation of Shamir threshold secrets to encrypt our secret, `007`, with a total number of shares that matches our total passphrase segment count and an entropy-significant N threshold. The result of encrypting our secret with the Shamir threshold implementation is an array of hexadecimal strings: `['801c13a8e859b1d857267d2a418c740f', ...]`.

We now have two arrays of equal length, and perform the following steps:

1. Begin iterating the array of hexadecimal threshold secret value to generate a map of transformed values.

2. For each iteration, convert the hexadecimal share and the passphrase segment at the same index to decimal notation.

3. For each iteration, subtract the decimal value of the passphrase segment from the decimal value of the secret share, then return the result in hexadecimal notation.

*Pseudo code for honeying shares:*

```javascript
var honiedShares = shares.map((share, i) => {
  return hexToDecimal(share) - wordToDecimal(words[i]);
})
```

The resulting array is 12 hexadecimal values that have been transformed to seemingly valid threshold secret shares, but have been honied by modifying their values in relation to the paired inputs. Exposed at rest, these shares appear as valid as any other set of threshold secret shares, but they are not valid for retrieval of the secret in any combination without reapplying the honied values.

### Reassembly of Shares & Regeneration of Secret

To reassemble the shares and regenerate the secret, we must reapply the decimal value of the honey inputs from our passphrase to the honied share values. If we store the honied values in the same order as the filtered passphrase values we used to modify them, and recollected the passphrase exactly, it would simply be a process of iterating the arrays and adding each passphrase segment's decimal value back into its corresponding modified share. However, if we recollected the passphrase differently than when we generated the shares, or randomized the share positions, the array values would not align in some or all places, which would generate invalid shares when their value pairs are merged.

##### The Brute Force is With You

In order to recombine the honey inputs with their shares correctly, without an assumption of perfect alignment, we generate a version of each possible share and honey input. This results in 144 share values, of which only 12 are correct.

To recombine and retrieve the secret, we iterate through all possible permutations and attempt to unlock with the Shamir implementation decryption function.


## Citations

[1] Joseph Jaeger, Thomas Ristenpart, and Qiang Tang. Honey Encryption Beyond Message Recovery Security. February 23, 2016.

[2] Nirvan Tyagi, Jessica Wang, Kevin Wen, Daniel Zuo. Honey Encryption Applications. Implementation of an encryption scheme resilient to brute-force attacks. Computer & Network Security, Spring 2015. 

[3] B. Kausik. Method and apparatus for cryptographically camouflaged cryptographic key storage, certification and use, Jan. 2 2001.

[4] A. Juels and T. Ristenpart. Honey encryption: Security beyond the brute-force bound. In Advances in Cryptology - EUROCRYPT 2014 - 33rd Annual International Conference on the Theory and Applications of Cryptographic Techniques, Copenhagen, Denmark, May 11-15, 2014. Proceedings, pages 293–310, 2014.

[5] Generic description of Secret Sharing schemes. https://en.wikipedia.org/wiki/Secret_sharing

[6] Shamir, Adi (1979). "How to share a secret". Communications of the ACM 22 (11): 612–613.

[7] Blakley, G. R. (1979). "Safeguarding cryptographic keys". Proceedings of the National Computer Conference 48: 313–317.