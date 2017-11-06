const clientId = 'dde6a08af9ae44ae9fcf3453ba6cad94';
const authorizationUrl = 'https://accounts.spotify.com/authorize';
const apiBaseUrl = 'https://api.spotify.com/v1';
const uri = 'http://localhost:3000';
let accessToken;
let expirationTime;
let userId;

const Spotify = {
  getAccessToken() {
    if (expirationTime && Date.now() > expirationTime) {
      expirationTime = undefined;
      accessToken = undefined;
      userId = undefined;
      window.location.hash = '';
    }
    if (!accessToken) {
      if (window.location.hash.includes('#access_token')) {
        accessToken = window.location.hash.match(/(#access_token=)(.*?)(&)/)[2];
        const expiresIn = window.location.hash.match(/(expires_in=)(\d*)/)[2];
        const now = Date.now();
        expirationTime = now + (expiresIn * 1000);
      } else {
        window.location.href = `${authorizationUrl}?client_id=${clientId}&scope=playlist-modify-public&redirect_uri=${uri}&response_type=token`;
      }
    }
    return accessToken;
  },

  buildAuthorizationHeader() {
    const authorizationHeader = {
      Authorization: `Bearer ${this.getAccessToken()}`,
    };
    return authorizationHeader;
  },

  handleResponse(response) {
    if (response.ok) {
      return response.json();
    }

    throw new Error(`Spotify says '${response.statusText}'`);
  },

  getUserId() {
    if (userId) {
      return new Promise(
        resolve => resolve(userId),
      );
    }
    const getUserNameUrl = `${apiBaseUrl}/me`;
    return fetch(getUserNameUrl, {
      headers: this.buildAuthorizationHeader(),
    }).then(this.handleResponse,
    ).then(
      (jsonResponse) => {
        if (jsonResponse.id) {
          userId = jsonResponse.id;
          return jsonResponse.id;
        }
        throw new Error('userId: received bad format');
      },
    );
  },

  search(term) {
    const fetchUrl = `${apiBaseUrl}/search?type=track&q=${term}`;
    return fetch(fetchUrl, {
      headers: this.buildAuthorizationHeader(),
    }).then(this.handleResponse,
    ).then(
      (jsonResponse) => {
        if (jsonResponse.tracks) {
          return jsonResponse.tracks.items.map(
            item => ({
              id: item.id,
              title: item.name,
              album: item.album.name,
              artist: item.artists[0].name,
              uri: item.uri,
            }),
          );
        }
        throw new Error('Search results: bad format');
      },
    );
  },

  createPlaylist(title) {
    const createPlaylistUrl = `${apiBaseUrl}/users/${userId}/playlists`;
    return fetch(createPlaylistUrl, {
      method: 'POST',
      headers: this.buildAuthorizationHeader(),
      body: JSON.stringify({ name: title }),
    }).then(this.handleResponse,
    ).then(
      (jsonResponse) => {
        if (jsonResponse.id) {
          return jsonResponse.id;
        }
        throw new Error('received no playlistId');
      },
    );
  },

  saveTracksToPlaylist(playlistId, uriList) {
    const populatePlaylistUrl = `${apiBaseUrl}/users/${userId}/playlists/${playlistId}/tracks`;
    return fetch(populatePlaylistUrl, {
      method: 'POST',
      headers: this.buildAuthorizationHeader(),
      body: JSON.stringify({ uris: uriList }),
    }).then(
      this.handleResponse,
    );
  },

  save(title, tracks) {
    const uriList =
      tracks.map(
        track => track.uri,
      );
    return Spotify.getUserId()
      .then(
        () => Spotify.createPlaylist(title),
      ).then(
        playlistId => Spotify.saveTracksToPlaylist(playlistId, uriList),
      );
  },
};


export default Spotify;