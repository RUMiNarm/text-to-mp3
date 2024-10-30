const baseFreqs = {
  ド: 261.63,
  レ: 293.66,
  ミ: 329.63,
  ファ: 349.23,
  ソ: 392.0,
  ラ: 440.0,
  シ: 493.88,
  ン: 0 // 休符
};

const sampleRate = 44100;

function adjustOctave(freq, octave) {
  return freq * Math.pow(2, octave - 5);
}

function generateSineWave(frequency, duration) {
  const samples = duration * sampleRate;
  const wave = new Int16Array(samples);
  for (let i = 0; i < samples; i++) {
    const time = i / sampleRate;
    wave[i] = Math.sin(2 * Math.PI * frequency * time) * 32767;
  }
  return wave;
}

function generateWaveFromScore(score) {
  let fullWave = new Int16Array(0);
  score.forEach(({ note, duration, octave }) => {
    const baseFreq = baseFreqs[note];
    const frequency = adjustOctave(baseFreq, octave);
    const wave = generateSineWave(frequency, duration);

    const combinedWave = new Int16Array(fullWave.length + wave.length);
    combinedWave.set(fullWave);
    combinedWave.set(wave, fullWave.length);
    fullWave = combinedWave;
  });
  return fullWave;
}

function convertToMP3(wave) {
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const mp3Data = [];
  const maxSamples = 1152;
  for (let i = 0; i < wave.length; i += maxSamples) {
    const sampleChunk = wave.subarray(i, i + maxSamples);
    const mp3Buffer = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3Buffer.length > 0) mp3Data.push(mp3Buffer);
  }
  const mp3Buffer = mp3encoder.flush();
  if (mp3Buffer.length > 0) mp3Data.push(mp3Buffer);
  return new Blob(mp3Data, { type: 'audio/mp3' });
}

function parseStotonNotation(notation) {
  const score = [];
  let octave = 5;
  const notes = notation.match(
    /(↑|↓|[‘”]?(ド|レ|ミ|ファ|ソ|ラ|シ|ン)(ー*)[#♭]?|\d)/g
  );

  if (!notes) {
    alert('無効な入力です。');
    return score;
  }

  notes.forEach((note) => {
    if (note === '↑') {
      octave++;
    } else if (note === '↓') {
      octave--;
    } else if (/^\d$/.test(note)) {
      octave = parseInt(note);
    } else {
      const dashCount = (note.match(/ー/g) || []).length;
      let baseNote = note.match(/ド|レ|ミ|ファ|ソ|ラ|シ|ン/)[0];
      let duration = 1 + dashCount;
      let modifier = note.charAt(0);

      if (modifier === '‘') octave++;
      else if (modifier === '”') octave--;

      if (baseFreqs[baseNote]) {
        score.push({ note: baseNote, duration, octave });
      } else {
        console.warn(`未定義の音符: ${baseNote}`);
      }
    }
  });

  return score;
}

document.getElementById('convertButton').addEventListener('click', () => {
  const notationInput = document.getElementById('notationInput').value;
  const score = parseStotonNotation(notationInput);

  if (score.length > 0) {
    const wave = generateWaveFromScore(score);
    const mp3Blob = convertToMP3(wave);

    const url = URL.createObjectURL(mp3Blob);

    // ダウンロードリンクの設定
    const downloadButton = document.getElementById('downloadButton');
    downloadButton.href = url;
    downloadButton.download = 'output.mp3';
    downloadButton.style.display = 'block';
    downloadButton.textContent = 'MP3をダウンロード';

    // オーディオプレーヤーの設定
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src = url;
    audioPlayer.style.display = 'block';
  } else {
    alert('無効な表記方法です。正しい形式で入力してください。');
  }
});
