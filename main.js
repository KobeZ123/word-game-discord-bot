require('dotenv').config();
const Discord = require('discord.js');
const { Client, Intents } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
//const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"], partials: ["CHANNEL"] });


// creates an array from the words list 
var hangmanWords = fs.readFileSync('words.txt', 'utf8').split(/\r\n/);
var wordleWords = fs.readFileSync('wordle-words.txt', 'utf8').split(/\r\n/);

// stores the active games played by users 
var activeGameList = new Array();

// readies the bot 
client.once('ready', () => {
    console.log('Word Game Bot is online');
    client.user.setStatus('idle');
    client.user.setActivity({name: 'type #help for assistance'});
    
});

// help message 
var HELP_MESSAGE = `Here are the commands available with the Word Game Discord Bot
    \n**#playhangman** - start a game of Hangman
    \n**#playwordle** - start a game of Wordle`;

client.on('messageCreate', (msg) => {
    // ensuring the bot does not respond to itself
    if (msg.author.bot) {
        return;
    }
    // checking if help has been requested 
    if (msg.content === '#help') {
        msg.channel.send(HELP_MESSAGE);
    }
    // checking if the user wants to play hangman 
    if (msg.content === '#playhangman') {
        // if the user is not currently playing a game, start the game
        if (checkNoActiveGame(msg.author)) {
            var hangmanGame = new HangmanGame(msg.author.username);
            activeGameList.push(hangmanGame);
            msg.channel.send('**Hangman Game** \nTo make a guess, type \'**#guess [your letter guess]**\'');
            msg.channel.send(hangmanGame.displayGameProgress());
            console.log('word: ' + hangmanGame.targetWord);
        }
        // else notifies the user that there is already an active game
        else {
            msg.channel.send('There is already an active word game. \nContinue playing or type \'**#stopgame**\' to end current game');
        }
    }
    // checking if the user wants to play wordle 
    if (msg.content === '#playwordle') {
        // if the user is not currently playing a game, start the game
        if (checkNoActiveGame(msg.author)) {
            var wordleGame = new WordleGame(msg.author.username);
            activeGameList.push(wordleGame);
            msg.channel.send(`**Wordle Game** \nTo make a guess, type \'**#guess [your 5-letter word guess]**\'\nThe style of the letter indicates how close the guess was to the word.\n**Bolded** letters show that the letter is in the word and in the correct place.\n*Italicized* letters show that the letter is in the word but not in the correct place.\nNormal letters show that the letter is not in the word in any spot.`);
            console.log('word: ' + wordleGame.targetWord);
        }
    }
    // checking if the user is making a guess
    if (msg.content.startsWith('#guess')) {
        messageContent = msg.content.replace('#guess ', '');
        // if the user currently has no active game, notify them 
        if (checkNoActiveGame(msg.author)) {
            msg.channel.send('Whoops, it seems like you are not currently playing a word game! \nTo learn how to start a game, type \'**#help**\'');
        }
        // submits the guess to the user's current game 
        else {
            activeGame = getActiveGame(msg.author);
            update = activeGame.updateGameStatus(messageContent);
            if (update === 'won') {
                msg.channel.send(activeGame.displayWin());
                removeFinishedGames();
            }
            if (update === 'loss') {
                msg.channel.send(activeGame.displayLoss());
                removeFinishedGames();
            }
            if (update === 'invalid') {
                msg.channel.send(activeGame.displayInvalid());
            }
            if (update === 'guessed') {
                msg.channel.send(activeGame.displayGuessed());
            }
            if (update === 'in-progress') {
                msg.channel.send(activeGame.displayGameProgress());
            }
        }
    }

    if (msg.content === '#displaygame') {
        if (!checkNoActiveGame(msg.author)) {

            activeGame = getActiveGame(msg.author);
            msg.channel.send(activeGame.displayGameProgress());
        }
    }

    // checking if the user wants to stop the game 
    if (msg.content === '#stopgame') {
        if (removeActiveGame(msg.author)) {
            msg.channel.send('Active games ended');
        }
        else {
            msg.channel.send('No active games to end');
        }
    }
});

// removes all games that are done 
function removeFinishedGames() {
    for (let i = 0; i < activeGameList.length; i = i + 1) {
        if (activeGameList[i].player === 'X') {
            return false;
        }
    }
    return true;
}

// checks that a user has no active games 
function checkNoActiveGame(user) {
    for (let i = 0; i < activeGameList.length; i = i + 1) {
        if (activeGameList[i].player === user.username) {
            return false;
        }
    }
    return true;
};

// removes active games of a given user 
function removeActiveGame(user) {
    for (let i = 0; i < activeGameList.length; i = i + 1) {
        if (activeGameList[i].player === user.username) {
            activeGameList.splice(i, 1);
            return true;
        }
    }
    return false;
} 

// gets the user's active game 
function getActiveGame(user) {
    for (let i = 0; i < activeGameList.length; i = i + 1) {
        if (activeGameList[i].player === user.username) {
            return activeGameList[i];
        }
    }
}

// this class manages a hangman game 
class HangmanGame {
    hangmanDrawings = ['', '⠀⠀O⠀⠀', '⠀⠀O⠀⠀\n⠀⠀|⠀⠀', 
        '⠀⠀O⠀⠀\n⠀--|', '⠀⠀O⠀⠀\n⠀--|--', '⠀⠀O⠀⠀\n⠀--|--\n⠀/', '⠀⠀O⠀⠀\n⠀--|--⠀\n⠀/⠀\\'];

    constructor(player) {
        this.player = player;
        this.targetWord = hangmanWords[Math.floor(Math.random() * hangmanWords.length)];
        this.badGuess = 0;
        this.guessList = new Array();
        this.guessProgress = new Array(this.targetWord.length).fill('-');
        console.log(this.targetWord);
    }

    // checks if the target word has been guessed
    hasWon() {
        for (let i = 0; i < this.targetWord.length; i = i + 1) {
            if (this.targetWord[i] != this.guessProgress[i]) {
                return false;
            }
        }
        return true;
    }
    
    // checks if all guesses have been used 
    hasLost() {
        return this.badGuess >= 6;
    }

    // makes a letter guess 
    makeGuess(letter) {
        this.guessList.push(letter);
        var goodGuess = false;
        for (let i = 0; i < this.targetWord.length; i = i + 1) {
            if (this.targetWord[i] == letter) {
                this.guessProgress[i] = letter;
                goodGuess = true;
            }
        }
        if (!goodGuess) {
            this.badGuess = this.badGuess + 1;
        }
    }

    // checks if the guess is an alphabet character
    checkIsLetter(letter) {
        return /^[a-zA-Z]+$/.test(letter);
    }



    // given a guess, returns the game's status as a string 
    updateGameStatus(letter) {
        if (!this.checkIsLetter(letter)) {
            return 'invalid';
        }
        if (this.guessList.includes(letter.toLowerCase())) {
            return 'guessed';
        }
        this.makeGuess(letter.toLowerCase());
        if (this.hasWon()) {
            this.player = 'X';
            return 'won';
        }
        else if (this.hasLost()) {
            this.player = 'X';
            return 'loss';
        }
        else {
            return 'in-progress';
        }
    }

    // displays the game's progress 
    displayGameProgress() {
        var wordProgress = '';
        var guessProgress = '';
        for (let i = 0; i < this.guessProgress.length; i = i + 1){
            wordProgress += this.guessProgress[i] + ' ';
        }
        for (let i = 0; i < this.guessList.length; i = i + 1){
            guessProgress += this.guessList[i] + ' ';
        }
        return '**Hangman**\n' + wordProgress + '\n' + '**Letters Guessed:**\n' + guessProgress + '\n' + this.hangmanDrawings[this.badGuess];
    }

    // returns a string representing the win text 
    displayWin() {
        return '**YOU WIN!** The word was **' + this.targetWord + '**. Great job!'
    }

    // returns a string representing the lose text 
    displayLoss() {
        return '**YOU LOSE!** The word was **' + this.targetWord + '**. There\'s always next time!'
    }

    displayInvalid() {
        return 'Invalid guess! Please try again by guessing a letter.';
    }

    displayGuessed() {
        return 'You have already guessed this letter! Try again!';
    }
}

// this class manages a wordle game 
class WordleGame {

    constructor(player) {
        this.player = player;
        this.targetWord = wordleWords[Math.floor(Math.random() * hangmanWords.length)];
        this.guessCount = 0;
        this.guessList = new Array();
        // a list of pairs (ex. ['a', 'green'])
        this.guessDisplay = new Array();
    }

    // checks if the target word has been guessed 
    hasWon() {
        return this.guessList.includes(this.targetWord);
    }

    // checks if all guesses have been used
    hasLost() {
        return this.guessCount >= 6;
    }

    // makes a guess and calculates how 
    makeGuess(word) {
        this.guessList.push(word);
        this.guessCount = this.guessCount + 1;
        var guessStatus = new Array(); 
        // checks if any letters are in the right position 
        for (let i = 0; i < this.targetWord.length; i = i + 1) {
            if (this.targetWord[i] === word[i]) {
                guessStatus.push([word[i], 'green']);
            }
            else if (this.targetWord.includes(word[i])) {
                guessStatus.push([word[i], 'yellow']);
            }
            else {
                guessStatus.push([word[i], 'grey']);
            }
        }
        this.guessDisplay.push(guessStatus);

    }

    // given a guess, returns the game's status as a string 
    updateGameStatus(word) {
        if (word.length != 5) {
            return 'invalid';
        }
        if (!wordleWords.includes(word)) {
            return 'guessed';
        }
        this.makeGuess(word.toLowerCase());
        if (this.hasWon()) {
            this.player = 'X';
            return 'won';
        }
        else if (this.hasLost()) {
            this.player = 'X';
            return 'loss';
        }
        else {
            return 'in-progress';
        }
    }


    // given a letter/guess status pair, returns the proper string display
    displayLetter(pair) {
        if (pair[1] === 'green') {
            return '**' + pair[0] + '**';
        }
        else if (pair[1] === 'yellow') {
            return '*' + pair[0] + '*';
        }
        else {
            return pair[0];
        }
    }

    // given a list of letter/guess status pairs, returns the proper string display of the word
    displayWord(guessWord) {
        var wordString = ''
        for (let i = 0; i < guessWord.length; i = i + 1) {
            wordString += this.displayLetter(guessWord[i]) + ' ';
        }
        return wordString;
    }

    // displays the game's progress 
    displayGameProgress() {
        var gameProgress = '';
        var guessProgress = '';
        for (let i = 0; i < this.guessDisplay.length; i = i + 1) {
            guessProgress += this.displayWord(this.guessDisplay[i]) + '\n';
        }
        gameProgress = 'Wordle \n' + guessProgress;
        return gameProgress;
    }

    // returns a string representing the win text 
    displayWin() {
        return this.displayGameProgress() + '\n**YOU WIN!** The word was **' + this.targetWord + '**. Great job!'
    }

    // returns a string representing the lose text 
    displayLoss() {
        return this.displayGameProgress() + '\n**YOU LOSE!** The word was **' + this.targetWord + '**. There\'s always next time!'
    }

    displayInvalid() {
        return 'Invalid guess! Please try again by guessing a 5-letter word.';
    }

    displayGuessed() {
        return 'Sorry, your word is not in the word list! Try again!';
    }


}



client.login(process.env.TOKEN);