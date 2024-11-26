const APIController = (function() {
    const clientID = 'da91e215c4754ea79581f056f2b3c2aa';
    const clientSecret = '486b2a7631ff44dc8623c44877b1eb53';

    const _getToken = async() => {

        const result = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Authorization' : 'Basic ' + btoa(clientID + ':' + clientSecret)
            },
            body: 'grant_type=client_credentials'
        });

        const data = await result.json();
        return data.access_token;
    }
    
    const _searchArtist = async(artist, token) => {
        const result = await fetch('https://api.spotify.com/v1/search?q=' + artist + '&type=artist&limit=5&market=NO', {
            method: 'GET',
            headers: { 
                'Content-Type' : 'application/json',
                'Authorization' : 'Bearer ' + token,
            }
        });
        const data = await result.json();
        return data.artists.items;
    }

    const _songPreview = async(artistID, token) => {
        const result = await fetch(`https://api.spotify.com/v1/artists/${artistID}/top-tracks`, {
            method: 'GET',
            headers: {
                'Content-Type' : 'application/json',
                'Authorization' : 'Bearer ' + token,
            }
        })
        const data = await result.json();
        return data;
    }

    const _getArtist = async(artistID, token) => {
        const result = await fetch(`https://api.spotify.com/v1/artists/${artistID}`, {
            method: 'GET',
            headers: {
                'Content-Type' : 'application/json',
                'Authorization' : 'Bearer ' + token,
            }
        })
        const data = await result.json();
        return data;
    }

    const _relatedArtists = async(artistID, token) => {
        const result = await fetch(`https://api.spotify.com/v1/recommendations/?seed_artists=${artistID}&limit=50`, {
            method: 'GET',
            headers: {
                'Content-Type' : 'application/json',
                'Authorization' : 'Bearer ' + token,
            }
        })   
        const data = await result.json();
        return data;
    }

    return {
        getToken() {
            return _getToken();
        },
        searchArtist(artist, token) {
            return _searchArtist(artist, token);
        },
        songPreview(artistID, token) {
            return _songPreview(artistID, token);
        },
        relatedArtists(artistID, token) {
            return _relatedArtists(artistID, token);
        },
        getArtist(artistID, token) {
            return _getArtist(artistID, token);
        }
    }
})();

let artistInput = '';
let artists;
let selectedArtist;

let focused = false;

let suggestedArtists;

ball = document.getElementById('ball');
ball.height = ball.width = 100;
console.log(ball.height);
ballInterval = null;

function moveLoadingBall() {
    let pixelsY = 0;
    let pixelsX = 0;
    let directionY = 1;
    let directionX = 1;
    ballInterval = setInterval(() => {
        ball.style.top = pixelsY+'px';
        ball.style.left = pixelsX+'px';
        pixelsY += 5 * directionY;
        pixelsX += 5 * directionX;
        if(pixelsY + ball.height + 5 > window.innerHeight) {
            directionY = -1;
        }
        if(pixelsX + ball.width + 5 > window.innerWidth) {
            directionX = -1;
        }
        if(pixelsY < 5) {
            directionY = 1;
        }
        if(pixelsX < 5) {
            directionX = 1;
        }
    }, 15);
}

function focusSearch() {
    focused = true; 
    if(document.getElementById('search').value == '')
        return;
    document.querySelector('.artist-suggestions').style.visibility = 'visible';
}

function unFocusSearch() {
    setTimeout(() => {
        document.querySelector('.artist-suggestions').style.visibility = 'hidden';
        focused = false;
    }, 200);
    
}

document.addEventListener('keydown', event => {
    if(!focused)
        return;
    if(event.key == 'Enter') {
        if(document.getElementById('search').value == '')
            return;
        console.log('reached');
        document.getElementById('search').blur(); 
        focused = false;
        unFocusSearch();
        selectedArtist = artists[0];
        findArtist();     
    }
})

async function getArtistSuggestions() {
    if(!focused)
        return;

    searchElement = document.getElementById('search');
    if(searchElement.value === '')
    {
        suggestionBox.style.visibility = 'hidden';
        return;
    }

    if(artistInput === searchElement.value)
        return;

    suggestionBox = document.querySelector('.artist-suggestions');
    suggestionBox.style.visibility = 'visible';
    artistInput = searchElement.value;

    const token = await APIController.getToken();
    artists = await APIController.searchArtist(artistInput, token);

    const suggestionContainer = document.querySelectorAll('.suggestion');
    for(let i = 0; i < suggestionContainer.length; i++) {
        if(artists[i].images[0])
        {
            suggestionContainer[i]
                .querySelector('.suggestion-image')
                .setAttribute('src', artists[i].images[0].url);
        }
        else
        {
            suggestionContainer[i]
                .querySelector('.suggestion-image')
                .setAttribute('src', './images/dark-pixel.png');

        }
        suggestionContainer[i]
            .querySelector('.suggestion-artist-name').textContent = artists[i].name;
    }
}

function clickMethod(index) {
    selectedArtist = artists[index];
    document.getElementById('search').value = selectedArtist.name;
    findArtist();
}

async function findArtist() {
    moveLoadingBall();
    const token = await APIController.getToken();

    const topSongs = await APIController.songPreview(selectedArtist.id, token);   
    
    const similarArtists = await APIController.relatedArtists(selectedArtist.id, token);

    createEmbed(topSongs.tracks[0].id);
    generateSearchedArtistUI(selectedArtist, selectedArtist.genres);
    createRecommendedArtistsCards(selectedArtist, similarArtists, token);
}

async function createRecommendedArtistsCards(searchedArtist, similarArtists, token) {
    ball.style.visibility = 'visible';
    const cardContainer = document.getElementById('recommended-artists');
    cardContainer.innerHTML = '';
    cardContainer.style.display = 'none';
    suggestedArtists = [];
    for(let i = 0; i < similarArtists.tracks.length; i++) {
        if(searchedArtist.id === similarArtists.tracks[i].artists[0].id)
            continue;
        //get i-th artist
        const artist = await APIController.getArtist(similarArtists.tracks[i].artists[0].id, token);
        suggestedArtists.push(artist);

        //create card element for recommended artist
        const card = document.createElement('div');
        card.className = 'recommended-artist-card';

        //create link for artist image to redirect to spotify
        const imageLink = document.createElement('a');
        imageLink.className = 'image-link';
        imageLink.setAttribute('target', '_blank');
        imageLink.setAttribute('href', similarArtists.tracks[i].external_urls.spotify);
        card.appendChild(imageLink);

        //create image element for artist image
        const image = document.createElement('img');
        image.className = 'recommended-artist-img';   
        if(artist.images[0])     
        {
            image.setAttribute('src', artist.images[0].url);
        }
        else 
        {
            image.setAttribute('src', './images/dark-pixel.png');
        }
        imageLink.appendChild(image);

        //create container for artist information
        const artistInfoContainer = document.createElement('div');
        artistInfoContainer.className = 'recommended-artist-button-name';
        card.appendChild(artistInfoContainer);

        //create audio element to play song preview
        const audioElement = document.createElement('audio');
        if(similarArtists.tracks[i].preview_url)
            audioElement.setAttribute('src', similarArtists.tracks[i].preview_url);
        else {            
            const audioPreview = await APIController.songPreview(similarArtists.tracks[i].artists[0].id, token);
            let found = false;
            let index = 0;
            while(index < audioPreview.tracks.length) {
                if(audioPreview.tracks[index].preview_url) {                    
                    audioElement.setAttribute('src', audioPreview.tracks[index].preview_url);
                    found = true;
                    break;
                }
                index++;
            }
            if(!found) {
                card.innerHTML = '';
                continue;
            }
        }
        artistInfoContainer.appendChild(audioElement);

        //create element for artist name
        const artistName = document.createElement('div');
        artistName.className = 'recommended-artist-name';
        artistName.textContent = similarArtists.tracks[i].artists[0].name;
        artistName.addEventListener('click', () => {
            document.getElementById('search').value = artistName.textContent; 
            selectedArtist = suggestedArtists.find((element) => element === artist);
            findArtist();
        });
        artistInfoContainer.appendChild(artistName);

        //create container for playback controls
        const playbackControls = document.createElement('div');
        playbackControls.className = 'recommended-artist-controls';
        artistInfoContainer.appendChild(playbackControls);

        //create play button
        const playButton = document.createElement('button');
        playButton.className = 'play-button';
                
        //create image element for play button
        const playButtonImage = document.createElement('img');
        playButtonImage.className = 'play-button-image';
        playButtonImage.setAttribute('src', './images/play-circle-svgrepo-com.svg');
        playButton.appendChild(playButtonImage);

        //add audio playback functionality
        playButton.onclick = function(){
            if(!audioElement.paused || audioElement.currentTime)
            {
                audioElement.pause();
                audioElement.currentTime = 0;
                playButton.firstChild.setAttribute('src', './images/play-circle-svgrepo-com.svg');
                return;
            }
            document.querySelectorAll('audio')
                .forEach(el => {el.pause(); el.currentTime = 0;});
            document.querySelectorAll('.play-button-image')
                .forEach(el => el.setAttribute('src', './images/play-circle-svgrepo-com.svg'));

            audioElement.play();
            playButton.firstChild.setAttribute('src', './images/pause-circle-svgrepo-com.svg');
        };

        playbackControls.appendChild(playButton);
        cardContainer.appendChild(card);
    }
    document.getElementById('info').style.position = 'static';
    ball.style.visibility = 'hidden';
    clearInterval(ballInterval);
    cardContainer.style.display = 'flex';
}
function createEmbed(songID) {
    let url = `https://open.spotify.com/embed/track/${songID}?utm_source=generator`
    let iframe = document.createElement('iframe');
    iframe.setAttribute('src', url);
    iframe.id = 'song-iframe';
    iframe.allowFullscreen = '';
    iframe.allow = 'clipboard-write; encrypted-media; picture-in-picture';
    iframe.loading = 'lazy';
    document.getElementById('song-iframe').replaceWith(iframe);
}
function generateSearchedArtistUI(artist, genres) {
    document.getElementById('info').style.position = 'absolute';

    document.getElementById('artist-img').setAttribute('src', artist.images[0].url);
    const artistNameContainer = document.getElementById('searched-artist-info');
    artistNameContainer.innerHTML = 'Artist';
    const artistName = document.createElement('a');
    artistName.className = 'artist-genre-link';
    artistName.id = 'searched-artist-name';
    artistName.textContent = artist.name;
    artistNameContainer.appendChild(artistName);
    const genresElement = document.getElementById('searched-artist-genres');
    genresElement.innerHTML = '';
    for(let i = 0; i < genres.length; i++) {
        const genreElement = document.createElement('a');
        genreElement.className = 'artist-genre-link';
        genreElement.textContent = genres[i];
        genresElement.appendChild(genreElement);
    }
    document.querySelector('.searched-artist-card').style.visibility = 'visible';
}
function capitalizeLetters(artist) {
    let words = artist.split(' ');
    return words.map((word) => {
        return word[0].toUpperCase() + word.substring(1);
    }).join(' ');
}