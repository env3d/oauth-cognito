const STORAGE = {
  AUTH_TOKEN: 'auth_token',
  PKCE_VERIFIER: 'auth_verifier'
};

export default class Auth {
  
  constructor({ baseUrl, clientId, onLogin } = {} ) {

    // this.token is now filled, either with an empty object or with tokens
    this.loadFromStorage();
    // get the verifier from storage so we can send challenge
    this.refreshVerifier();
    
    this.baseUrl = baseUrl || 'https://login.operatoroverload.com';
    this.clientId = clientId || '47ile8emo7m8flnhjfuc5aa9i0';    
    this.redirect_uri = `${window.location.origin}${window.location.pathname}`;
    
    window.addEventListener('load', () => {
      let params = new window.URLSearchParams(window.location.search);
      this.code = params.get('code');
      if (this.code && onLogin) onLogin.call(this);

      if (this.code) {
        window.history.pushState(
          {}, null, `${window.location.origin}${window.location.pathname}${window.location.hash}`
        );
      }
      
    });
  }

  loadFromStorage() {
    this.token = JSON.parse(window.localStorage.getItem(STORAGE.AUTH_TOKEN)) || {};
    return this.token;
  }
  
  refreshVerifier( randomString = null ) {
    // If caller provider randomString, replace the verifier,
    // otherwise just load it from storage
    this.verifier = randomString ? base64URLEncode(randomString) :
      window.localStorage.getItem(STORAGE.PKCE_VERIFIER);

    if (!this.verifier) {
      console.warn("cannot generate or load verifier string, probably first time using this app.  Welcome!");
      // prime the store some something
      this.verifier = 'some random string';
    }
    
    window.localStorage.setItem(STORAGE.PKCE_VERIFIER, this.verifier);
    
    this.challenge = base64URLEncode(sha256(this.verifier));
  }
  
  /**
   * We get a token - only interested in the id_token
   */
  getToken() {
    return new Promise( (resolve, reject) => {
      if (this.code) {
        this.authorize()
          .then( t => resolve(t) )
          .catch( e => reject(e) )
          .finally( () => this.code = null );
      } else if (this.token && this.token.id_token) {
        if (this.timeToExpiry() > 3570) {
          resolve(this.token.id_token);
        } else {
          this.refresh().then( t => resolve(t) ).catch( e => reject(e) );
        }
      } else {
        reject("cannot refresh and not auth code, should start login flow");
      }
    });
  }

  timeToExpiry(id_token) {
    id_token = id_token || this.token.id_token;
    return JSON.parse( window.atob(id_token.split('.')[1]) ).exp - ((new Date()).getTime() / 1000);
  }

  refresh() {
    return this.tokenEndpoint( { refresh_token: this.token.refresh_token } );
  }
  
  authorize() {
    return this.tokenEndpoint( { code: this.code} );
  }
  
  tokenEndpoint( { code: code, refresh_token: refresh_token } ) {

    let grant_type = refresh_token ? 'refresh_token' : 'authorization_code';    
    console.log(`getting ${grant_type}`);
    
    let body = [
      `client_id=${this.clientId}`,
      `grant_type=${grant_type}`,      
      `redirect_uri=${this.redirect_uri}`,
      refresh_token ? `refresh_token=${refresh_token}` : '',
      code ? `code=${code}` : '',
      `code_verifier=${this.verifier}`
    ].join('&');
    
    return new Promise( (resolve, reject) => {
      window.fetch(`${this.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      }).then( res => {
        return res.json();
      }).then( json => {
        console.log(json);
        if (json.error) {
          reject( json );
        } else {        
          // save the token in storage and in the object
          Object.assign(this.token, json);
          window.localStorage.setItem(STORAGE.AUTH_TOKEN, JSON.stringify(this.token));
          resolve( json.id_token );
        }
      });      
    });
  }
  
  login() {    
    let randomString = crypto.getRandomValues ? String.fromCharCode.apply(
      null, crypto.getRandomValues(new Uint8Array(10)).map( b => b%26 + 97)
    ) : crypto.randomBytes(32);
    
    this.refreshVerifier(randomString);
    
    let loginUrl = [
      `${this.baseUrl}/login?client_id=${this.clientId}`,
	    `response_type=code`,
	    `scope=email+openid+profile`,
      `code_challenge=${this.challenge}`,
      `code_challenge_method=S256`,
	    `redirect_uri=${this.redirect_uri}`
    ].join('&');

    window.location.href = loginUrl;
  };    
}

// Support functions
function base64URLEncode(str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// from https://geraintluff.github.io/sha256/
// but modified to output base64
function sha256(ascii) {
	function rightRotate(value, amount) {
		return (value>>>amount) | (value<<(32 - amount));
	};
	
	var mathPow = Math.pow;
	var maxWord = mathPow(2, 32);
	var lengthProperty = 'length'
	var i, j; // Used as a counter across the whole file

	var words = [];
	var asciiBitLength = ascii[lengthProperty]*8;
	
	//* caching results is optional - remove/add slash from front of this line to toggle
	// Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
	// (we actually calculate the first 64, but extra values are just ignored)
	var hash = sha256.h = sha256.h || [];
	// Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
	var k = sha256.k = sha256.k || [];
	var primeCounter = k[lengthProperty];
	/*/
	var hash = [], k = [];
	var primeCounter = 0;
	//*/

	var isComposite = {};
	for (var candidate = 2; primeCounter < 64; candidate++) {
		if (!isComposite[candidate]) {
			for (i = 0; i < 313; i += candidate) {
				isComposite[i] = candidate;
			}
			hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0;
			k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0;
		}
	}
	
	ascii += '\x80' // Append Ƈ' bit (plus zero padding)
	while (ascii[lengthProperty]%64 - 56) ascii += '\x00' // More zero padding
	for (i = 0; i < ascii[lengthProperty]; i++) {
		j = ascii.charCodeAt(i);
		if (j>>8) return; // ASCII check: only accept characters in range 0-255
		words[i>>2] |= j << ((3 - i)%4)*8;
	}
	words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
	words[words[lengthProperty]] = (asciiBitLength)
	
	// process each chunk
	for (j = 0; j < words[lengthProperty];) {
		var w = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
		var oldHash = hash;
		// This is now the undefinedworking hash", often labelled as variables a...g
		// (we have to truncate as well, otherwise extra entries at the end accumulate
		hash = hash.slice(0, 8);
		
		for (i = 0; i < 64; i++) {
			var i2 = i + j;
			// Expand the message into 64 words
			// Used below if 
			var w15 = w[i - 15], w2 = w[i - 2];

			// Iterate
			var a = hash[0], e = hash[4];
			var temp1 = hash[7]
				+ (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) // S1
				+ ((e&hash[5])^((~e)&hash[6])) // ch
				+ k[i]
				// Expand the message schedule if needed
				+ (w[i] = (i < 16) ? w[i] : (
						w[i - 16]
						+ (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3)) // s0
						+ w[i - 7]
						+ (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)) // s1
					)|0
				);
			// This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
			var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) // S0
				+ ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2])); // maj
			
			hash = [(temp1 + temp2)|0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
			hash[4] = (hash[4] + temp1)|0;
		}
		
		for (i = 0; i < 8; i++) {
			hash[i] = (hash[i] + oldHash[i])|0;
		}
	}
  
	var result = [];
	for (i = 0; i < 8; i++) {
		for (j = 3; j + 1; j--) {
			var b = (hash[i]>>(j*8))&255;
			//result += ((b < 16) ? 0 : '') + b.toString(16);
      result.push(b);
		}
	}
  //return result;  
	//return Uint8Array.from(result);
  
  return btoa(String.fromCharCode.apply(null, Uint8Array.from(result)));
};

// Need to use commonjs module export for UMD
// https://github.com/parcel-bundler/parcel/issues/766
//
module.exports = Auth;
