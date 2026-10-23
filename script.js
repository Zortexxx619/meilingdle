const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") || "dailystandard";
const daily = (mode === "dailystandard") || (mode === "dailyhard");
const hard = (mode === "dailyhard") || (mode === "randomhard");
const max_guesses = hard ? 3 : 6;

const tiles = [];
let filled_tiles = 0;
let guesses_made = 0;
const guesses = [[]];
let game_finished = false;
const ids = ["meiling", "meilingfear", "meilingblush", "mwaaling"];
const count = new Map;
const seq = [];

const board = document.getElementById("board");
const popup = document.getElementById("results");
const keys = document.querySelectorAll("#keyboard .key");
const imgs = new Map;
const result_title = document.getElementById("result-title");
const result_text = document.getElementById("result-text");
const copy_result_text = document.getElementById("copy-result");

const result_messages = [
	":meilinghorror:",
	"Holy Shit",
	"wordle in 2 gyro gif",
	":suika:",
	"splendid",
	"you can guarantee get this in 4 btw",
	"you can guarantee get this in 4 btw"
];
const today = get_date_string();
const emoji_text = [];
const share_button = document.getElementById("share-btn");
const close_button = document.getElementById("close-btn");

function get_date_string() {
	const now = new Date();
	return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function saveGame() {
	try {
		localStorage.setItem("date", today);
		if (hard)
			localStorage.setItem("hard_guesses", JSON.stringify(guesses));
		else
			localStorage.setItem("standard_guesses", JSON.stringify(guesses));
		console.log("Saved");
	} catch (err) {
		console.warn("Couldn't save:", err);
	}
}

function loadGame() {
	if (!daily)
		return;
	try {
		const date = localStorage.getItem("date");
		console.log("saved date = ", date, " today = ", today);
		if (date != today) {
			localStorage.removeItem("hard_guesses");
			localStorage.removeItem("standard_guesses");
			return;
		}
		if (hard) {
			const raw_guesses = localStorage.getItem("hard_guesses");
			if (!raw_guesses)
				return;
			const loaded_guesses = JSON.parse(raw_guesses);
			for (guess of loaded_guesses) {
				for (id of guess)
					append_guess(id)
				submit();
			}
		} else {
			const raw_guesses = localStorage.getItem("standard_guesses");
			if (!raw_guesses)
				return;
			const loaded_guesses = JSON.parse(raw_guesses);
			for (guess of loaded_guesses) {
				for (id of guess)
					append_guess(id)
				submit();
			}
		}
	} catch (err) {
		console.warn("Couldn't load:", err);
	}
}

function random_int(max) {
	return Math.floor(Math.random() * max);
}

function mulberry32(seed) {
	// console.log("rand seed = ", seed);
	return function () {
		seed = (seed + 0x6D2B79F5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function get_date_value() {
	const now = new Date();
	return now.getFullYear() * 512 + now.getMonth() * 32 + now.getDate();
}

function make_sequence(is_daily = true, variation = 1) {
	const rand = is_daily ? mulberry32(get_date_value() * variation) : Math.random;
	for (let i = 0; i < 8; i++) {
		const id = ids[Math.floor(rand() * 4)];
		seq.push(id);
		count.set(id, (count.get(id) || 0) + 1);
	}
}

function build_board() {
	for (let i = 0; i < max_guesses; i++) {
		for (let j = 0; j < 8; j++) {
			tiles.push(document.createElement("div"));
			tiles.at(-1).classList.add("tile");
			board.appendChild(tiles.at(-1));
		}
	}
}

function end_game(won) {
	game_finished = true;
	if (!daily)
		return;

	if (!won) 
		guesses_made = 0;
	result_title.textContent = result_messages[guesses_made];
	let mode_name = "";
	if (mode === "dailystandard")
		mode_name = "Standard";
	else if (mode === "dailyhard")
		mode_name = "Hard";
	result_text.textContent = "Meilingdle " + today + ' ' + mode_name + '\n'
		+ (won ? guesses_made : 'X') + '/' + max_guesses + '\n'
		+ emoji_text.join("\n");

	popup.classList.toggle("hidden");
}

function submit() {
	if (game_finished || filled_tiles < 8)
		return;

	const missing = new Map(count);
	let correct = 0;
	const emojis = [];
	emojis.length = 8;

	for (let i = 0; i < 8; i++) {
		if (seq[i] != guesses.at(-1)[i])
			continue;
		const id = guesses.at(-1)[i];
		missing.set(id, (missing.get(id) || 0) - 1);
		tiles[i + guesses_made * 8].classList.add("correct");
		correct++;
		emojis[i] = '🟩';
	}

	for (let i = 0; i < 8; i++) {
		if (seq[i] === guesses.at(-1)[i])
			continue;
		const id = guesses.at(-1)[i];
		if ((missing.get(id) || 0) > 0) {
			missing.set(id, (missing.get(id) || 0) - 1);
			tiles[i + guesses_made * 8].classList.add("present");
			emojis[i] = '🟨';
		} else {
			tiles[i + guesses_made * 8].classList.add("absent");
			emojis[i] = '⬛';
		}
	}

	if (daily)
		saveGame();

	guesses_made++;
	filled_tiles = 0;
	guesses.push([]);
	emoji_text.push(emojis.join(""));

	if (correct === 8)
		end_game(true);
	else if (guesses_made >= max_guesses)
		end_game(false);
}

function backspace() {
	if (filled_tiles <= 0)
		return;
	filled_tiles--;
	guesses.at(-1).pop();
	tiles[filled_tiles + guesses_made * 8].replaceChildren();
}

function append_guess(id) {
	if (filled_tiles >= 8 || game_finished)
		return;
	if (!imgs.has(id))
		return;
	guesses.at(-1).push(id);
	tiles[filled_tiles + guesses_made * 8].appendChild(imgs.get(id).cloneNode());
	filled_tiles++;
}

function button_press(id) {
	// console.log("pressed", id);
	if (id === "backspace")
		backspace();
	else if (id === "submit")
		submit();
	else
		append_guess(id);
}

build_board();

for (btn of keys) {
	btn.addEventListener("click", button_press.bind(null, btn.dataset.id));
	imgs.set(btn.dataset.id, btn.querySelector("img"));
}

document.addEventListener("keydown", (event) => {
	switch (event.code) {
		case "Digit1":
			button_press("meiling");
			break;
		case "Digit2":
			button_press("meilingfear");
			break;
		case "Digit3":
			button_press("meilingblush");
			break;
		case "Digit4":
			button_press("mwaaling");
			break;
		case "Enter":
			button_press("submit");
			break;
		case "Backspace":
			button_press("backspace");
			break;
	}
});

// if (!daily)
// 	document.getElementById("restart-button").classList.toggle("hidden")

share_button.addEventListener("click", async () => {
	try {
		await navigator.clipboard.writeText(result_text.textContent);
		copy_result_text.textContent = "Copied to clipboard";
	} catch (err) {
		console.error("Clipboard failed:", err);
		copy_result_text.textContent = "Failed to copy";
	}
});

close_button.addEventListener("click", () => {
	popup.classList.toggle("hidden");
});

for (link of document.querySelectorAll("#links .link")) {
	if (link.dataset.mode === mode) {
		link.removeAttribute('href');
		link.style.pointerEvents = 'none';
		link.style.cursor = 'default';
		// link.style.fontWeight = 'bold';
	}
}

make_sequence(daily, hard ? 2 : 1);
// console.log("sequence = ", seq);
// console.log("count = ", count);

loadGame();