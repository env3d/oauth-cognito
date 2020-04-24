import crypto from 'crypto-browserify';

const STORAGE = {
  AUTH_TOKEN: 'auth_token',
  PKCE_VERIFIER: 'auth_verifier'
};

export default class Auth {
  
  constructor({ baseUrl, clientId, onLogin }) {

    // this.token is now filled, either with an empty object or with tokens
    this.loadFromStorage();
    // get the verifier from storage so we can send challenge
    this.refreshVerifier();
    
    this.baseUrl = baseUrl || 'https://operatoroverload.auth.us-west-2.amazoncognito.com';    
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
    this.refreshVerifier(base64URLEncode(crypto.randomBytes(32)));
    
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

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}

// Need to use commonjs module export for UMD
// https://github.com/parcel-bundler/parcel/issues/766
//
module.exports = Auth;
