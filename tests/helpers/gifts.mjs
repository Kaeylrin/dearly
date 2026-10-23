export function waveFile() {
  const samples = 16000
  const buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  return buffer
}

export const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7GsAAAAASUVORK5CYII='
export const gifts = {
  letter: { body: 'Words written just for you.', to: 'You', closing: '', from: 'Me' },
  bouquet: { flowers: ['rose:red', 'lily:white'], positions: [13, 0], wrap: 'cone', paper: 'kraft', ribbon: 'rouge', note: 'Flowers from me to you.', from: 'Me' },
  countdown: { target: '2020-01-01T00:00:00.000Z', date: '2020-01-01', time: '08:00', tz: 'Asia/Manila', monthly: false, message: 'Our special moment is here.', from: 'Me' },
  scratch: { message: 'A lovely surprise.', hint: 'A secret', from: 'Me' },
  reasons: { title: 'My reasons', reasons: ['You listen.', 'You make me smile.'], from: 'Me' },
  timeline: { title: 'Our memories', entries: [{ date: '2026-01-01', title: 'The beginning', note: 'Our first memory.', photo }], from: 'Me' },
  voice: { title: 'Listen to this', audio: `data:audio/wav;base64,${waveFile().toString('base64')}`, duration: 2, note: 'A voice for you.', from: 'Me' },
  quiz: { title: 'Our little quiz', questions: [{ q: 'Which drink?', options: ['Tea', 'Coffee'], answer: 0 }], outro: 'You did it.', from: 'Me' },
}
