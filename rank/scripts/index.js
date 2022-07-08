const canVibrate = window.navigator.vibrate;

//Helper: Get Query
function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

//helper (mostly to clear listeners)
function recreateNode(el, withChildren) {
  if (withChildren) {
    el.parentNode.replaceChild(el.cloneNode(true), el);
  } else {
    var newEl = el.cloneNode(false);
    while (el.hasChildNodes()) newEl.appendChild(el.firstChild);
    el.parentNode.replaceChild(newEl, el);
  }
}

const beforeUnloadListener = (event) => {
  if (window.submitQueue.length != 0) {
    let str = "You have unsaved changes!";
    event.preventDefault();

    return event.returnValue = str;
  }
};

function loadCard(index, data) {
  if (data['layout'] == 'transform' || data['layout'] == 'modal_dfc') { //dfc's
    var img = document.getElementById("cardImage" + index + '-1');
    var img2 = document.getElementById("cardImage" + index + '-2');
    var newImg = new Image;
    var newImg2 = new Image;

    newImg.onload = function() {
      img.src = this.src;
      document.getElementById("cardImage" + index + '-1').style = "opacity:1;";
      document.getElementById("loader" + index).style = "display:none;";
      window.submitReady[index] += 0.5;
      if (window.submitReady[index] == 1) {
        document.getElementById('card' + index).classList.remove('cardHover');
        document.getElementById("flipButt" + index).style="";
      }
    }
    newImg.src = data['card_faces'][0]['image_uris']['normal'];

    newImg2.onload = function() {
      img2.src = this.src;
      window.submitReady[index] += 0.5;
      if (window.submitReady[index] == 1) {
        document.getElementById('card' + index).classList.remove('cardHover');
        document.getElementById("flipButt" + index).style="";
      }
    }
    newImg2.src = data['card_faces'][1]['image_uris']['normal'];

  } else { //normal cards
    var img = document.getElementById("cardImage" + index + '-1');
    var newImg = new Image;
    newImg.onload = function() {
      img.src = this.src;
      document.getElementById('card' + index).classList.remove('cardHover');
      document.getElementById("cardImage" + index + '-1').style = "opacity:1;";
      document.getElementById("loader" + index).style = "display:none;";
      window.submitReady[index] += 1;
    }
    newImg.src = data['image_uris']['normal'];
  }
}

function requestCard(index, id) {
  fetch('https://api.scryfall.com/cards/' + id)
    .then(response => response.json())
    .then(data => loadCard(index, data))
    .catch(error => {
      console.error('Card id:' + id);
      console.error(error);
      $.alert({
        title: '<span class=\"modalTitle\">Error</span>',
        content: '<span class=\"modalText\">Couldn\'t load card image and information. Check your connection and/or Scryfall API status.</span>',
        type: 'red',
        theme: 'dark',
        animation: 'top',
        closeAnimation: 'top',
        animateFromElement: false,
        boxWidth: 'min(400px, 80%)',
        draggable: false,
        useBootstrap: false,
        typeAnimated: true,
        backgroundDismiss: false,
        buttons: {
          tryagain: {
            text: 'Try again',
            btnClass: 'btn-red',
            action: function() {
              loadChoices();
            }
          }
        }
      });
    });
}

function loadChoices(id1, id2) {

  let d = new Date();
  if (d - window.limiter.d < window.limiter.limit) {
    console.log("Rate Limited: " + (window.limiter.limit - (d - window.limiter.d)));
    clearTimeout(window.limiter.timeout);
    window.limiter.timeout = setTimeout(function() {
      loadChoices();
    }, window.limiter.limit - (d - window.limiter.d));
    return;
  }

  window.limiter.d = d;
  window.submitReady = {
    1: 0,
    2: 0
  };
  if (id1 == null) {
    let r = Math.floor(Math.random() * window.cardList.length);
    window.cardIds[0] = window.cardList[r];
  } else {
    window.cardIds[0] = id1;
  }

  if (id2 == null) {
    r = Math.floor(Math.random() * window.cardList.length);
    window.cardIds[1] = window.cardList[r];
  } else {
    window.cardIds[1] = id2
  }

  document.getElementById("cardImage1-1").style = "opacity:0; transition: opacity 0s;";
  document.getElementById("loader1").style = "";
  document.getElementById("flipButt1").style= "display:none;";
  document.getElementById('card1').classList.remove('cardHover');
  document.getElementById('flip-card1').classList.remove('flipped');
  requestCard(1, window.cardIds[0]);

  document.getElementById("cardImage2-1").style = "opacity:0; transition: opacity 0s;";
  document.getElementById("loader2").style = "";
  document.getElementById("flipButt2").style= "display:none;";
  document.getElementById('card2').classList.remove('cardHover');
  document.getElementById('flip-card2').classList.remove('flipped');

  setTimeout(function() {
    requestCard(2, window.cardIds[1]);
  }, 50); //delay for scryfall api rates
}

function setInputs() {
  document.getElementById('winnerInput').value = window.submitQueue.winners.toString();
  document.getElementById('loserInput').value = window.submitQueue.losers.toString();
}

function submitRankleForm() {
  if (window.submitQueue.length == 0)
    return;
  document.getElementById('submitButton').disabled = true;

  console.log('form submitted!');

  // document.getElementById('rankleForm').submit();
  window.submitQueue.winners = [];
  window.submitQueue.losers = [];
  window.submitQueue.length = 0;
}

function chooseCard(choice) {
  if (window.submitReady[1] + window.submitReady[2] != 2) //a hacky semaphore
    return;
  window.submitQueue.length += 1;
  window.submitQueue.winners.push(window.cardIds[choice]);
  window.submitQueue.losers.push(window.cardIds[1 - choice]);
  setInputs();
  loadChoices();
  clearTimeout(window.submitTimer);
  document.getElementById('submitButton').disabled = false;
  document.getElementById('submitButton').innerText = "Submit (" + window.submitQueue.length + ")";

  if (window.submitQueue.length >= 60) {
    autoSubmit();
  } else {
    window.submitTimer = setTimeout(function() {
      autoSubmit();
    }, 60000);
  }
}

function autoSubmit() {
  document.getElementById('submitButton').innerText = "Auto-submitting...";
  setTimeout(function() {
    document.getElementById('submitButton').innerText = "Submit (" + window.submitQueue.length + ")";
  }, 3100);
  submitRankleForm();
}

function helpModal() {
  $.dialog({
    title: '<span class=\"modalTitle\">What is Rankle?</span>',
    content: '<span class=\"helpText\">Pick the <a href="https://magic.wizards.com/en" target="_blank">Magic: The Gathering</a> Card between the two that you like more.<br><br>' +
      'There is no criteria, you can decide holistically which card deserves your pick more. It could be art, lore, card mechanic, or even nostalgia!<br><br></span><div class="hr"></div>' +
      '<span class=\"helpText\">Your picks help us rank cards based on an elo system to see what the community likes!',
    theme: 'dark',
    animation: 'top',
    closeAnimation: 'top',
    animateFromElement: false,
    boxWidth: 'min(400px, 80%)',
    draggable: false,
    backgroundDismiss: true,
    useBootstrap: false
  });
}

//function to handle menu button
function menuModal() {

  let menuD = $.dialog({
    title: '',
    content: '<div class="modalTitle" style="text-align: center;font-size: 30px;">Rankle</div>' +
      '<br><button id="rankingsButton" class="menuButton">See Rankings</button>' +
      '<br><br><div class="hr"></div>' +
      '<div class="modalText" id="credits">Credits <span id="creditExpand" class="material-symbols-outlined"> expand_more </span></div>' +
      '<div id="creditText"class="expandiv collapsediv">' +
      '• Card Images: <a href="https://scryfall.com/" target="_blank">Scryfall</a>' +
      '<br>• Font: <a href="https://company.wizards.com/en" target="_blank">Wizards of the Coast</a><br><br></div>' +
      '<div class="hr"></div><div class=\"modalText\" id="disclaimer">Disclaimer  <span id="disclaimerExpand" class="material-symbols-outlined"> expand_more </span></div>' +
      '<div id="disclaimerText" class="expandiv collapsediv">Portions of Befuddle are unofficial Fan Content permitted under the <a href="https://company.wizards.com/en/legal/fancontentpolicy" target="_blank">Wizards of the Coast Fan Content Policy</a>. ' +
      'The literal and graphical information presented on this site about Magic: The Gathering, including card images, the mana symbols, is copyright Wizards of the Coast, LLC, a subsidiary of Hasbro, Inc. Befuddle is not produced by, endorsed by, supported by, or affiliated with Wizards of the Coast.<br><br></div>' +
      '<div class="hr"></div>' +
      '<div class="helpText" style="text-align: center;line-height:1.8;">Developed with <span id="easterEggHeart" class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;"> favorite </span> by Suitangi' +
      '<br><a><span id="rab">Report a Bug</span></a>' +
      '<br><a><span id="bmad">Buy me a Drink</span></a></div>',
    theme: 'dark',
    animation: 'left',
    closeAnimation: 'left',
    animateFromElement: false,
    boxWidth: 'min(400px, 80%)',
    draggable: false,
    backgroundDismiss: true,
    useBootstrap: false,
    onContentReady: function() {
      document.getElementById('credits').addEventListener('click', function() {
        let s = document.getElementById('creditText');
        if (!s.classList.contains('collapsediv')) {
          s.classList.add('collapsediv');
          document.getElementById('creditExpand').classList.remove('rotato');
        } else {
          s.classList.remove('collapsediv');
          document.getElementById('creditExpand').classList.add('rotato');
        }
      });
      document.getElementById('disclaimer').addEventListener('click', function() {
        let s = document.getElementById('disclaimerText');
        if (!s.classList.contains('collapsediv')) {
          s.classList.add('collapsediv');
          document.getElementById('disclaimerExpand').classList.remove('rotato');
        } else {
          s.classList.remove('collapsediv');
          document.getElementById('disclaimerExpand').classList.add('rotato');
        }
      });
      document.getElementById('rankingsButton').addEventListener('click', function() {
        prankle('Get Prankled', 'Just kidding. This feature is still under development');
        console.log('Go to rankings page');
      });

      document.getElementById('rab').addEventListener('click', function() {
        menuD.close();
        prankle('Get Prankled', 'Just kidding. This feature is still under development');
        // reportBug();
      });
      document.getElementById('bmad').addEventListener('click', function() {
        prankle('Get Prankled', 'Just kidding. This feature is still under development');
        // buyDrink();
      });
      document.getElementById('easterEggHeart').addEventListener('click', function() {
        prankle('Get Prankled', 'Love to my beta testers: Pkmnfn and Ksax');
        // easterEgg();
      });
    }
  });
}

function prankle(title, text) {
  $.dialog({
    title: '<span class=\"modalTitle\">' + title + '</span>',
    content:
      '<img id="prankleImage" src="./imgs/rankle.webp"><br><div class="hr"></div>' +
      '<span class=\"helpText\">' + text + '</span>',
    theme: 'dark',
    type: 'red',
    animation: 'top',
    closeAnimation: 'top',
    animateFromElement: false,
    boxWidth: 'min(400px, 80%)',
    draggable: false,
    backgroundDismiss: true,
    useBootstrap: false
  });
}

//start script
$(document).ready(function() {
  window.submitQueue = {};
  window.submitQueue.winners = [];
  window.submitQueue.losers = [];
  window.submitQueue.length = 0;
  window.submitTimer;
  window.cardIds = [0, 0];
  window.limiter = {};
  window.limiter.limit = 1500;
  window.limiter.timeout;
  window.limiter.d = 0;
  window.submitReady = {
    1: 0,
    2: 0
  };

  document.getElementById('cardImage1-1').addEventListener('click', function() {
    chooseCard(0);
  });
  document.getElementById('cardImage1-2').addEventListener('click', function() {
    chooseCard(0);
  });
  document.getElementById('cardImage2-1').addEventListener('click', function() {
    chooseCard(1);
  });
  document.getElementById('cardImage2-2').addEventListener('click', function() {
    chooseCard(1);
  });
  document.getElementById('card1').addEventListener('mouseenter', function() {
    this.classList.add('cardHover');
  });
  document.getElementById('card2').addEventListener('mouseenter', function() {
    this.classList.add('cardHover');
  });
  document.getElementById('card1').addEventListener('touchstart', function() {
    this.classList.add('cardHover');
  });
  document.getElementById('card2').addEventListener('touchstart', function() {
    this.classList.add('cardHover');
  });

  document.getElementById('flipButt1').addEventListener('click', function() {
    console.log('test1');
    document.getElementById('flip-card1').classList.toggle('flipped');
  });
  document.getElementById('flipButt2').addEventListener('click', function() {
    console.log('test2');
    document.getElementById('flip-card2').classList.toggle('flipped');
  });

  document.getElementById('menu-button').addEventListener('click', function() {
    menuModal();
  });
  document.getElementById('help-button').addEventListener('click', function() {
    helpModal();
  });


  document.getElementById('submitButton').addEventListener('click', function() {
    if (this.disabled)
      return;
    submitRankleForm();
  });

  addEventListener("beforeunload", beforeUnloadListener, {
    capture: true
  });

  fetch('https://raw.githubusercontent.com/suitangi/Rankle/main/rank/cardList.json')
    .then(response => response.json())
    .then(data => {
      document.getElementById('submitButton').style = '';
      document.getElementById('flipButt1').style = '';
      document.getElementById('flipButt2').style = '';
      window.cardList = data;
      loadChoices();
    })
    .catch(error => {
      console.error('There was an error!', error);
    });
});
