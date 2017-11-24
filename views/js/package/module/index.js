'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Constants = {
	VERSION: '1.1.4',
	NOTES: []
};

(function () {
	var allNotes = [['C'], ['C#', 'Db'], ['D'], ['D#', 'Eb'], ['E'], ['F'], ['F#', 'Gb'], ['G'], ['G#', 'Ab'], ['A'], ['A#', 'Bb'], ['B']];
	var counter = 0;

	var _loop = function _loop(i) {
		allNotes.forEach(function (noteGroup) {
			noteGroup.forEach(function (note) {
				return Constants.NOTES[counter] = note + i;
			});
			counter++;
		});
	};

	for (var i = -1; i <= 9; i++) {
		_loop(i);
	}
})();

exports.Constants = Constants;
var Player = function () {
	function Player(eventHandler, buffer) {
		_classCallCheck(this, Player);

		this.sampleRate = 5;
		this.startTime = 0;
		this.buffer = buffer || null;
		this.division;
		this.format;
		this.setIntervalId = false;
		this.tracks = [];
		this.tempo = 120;
		this.startTick = 0;
		this.tick = 0;
		this.lastTick = null;
		this.inLoop = false;
		this.totalTicks = 0;
		this.events = [];
		this.totalEvents = 0;
		this.eventListeners = {};

		if (typeof eventHandler === 'function') this.on('midiEvent', eventHandler);
	}

	_createClass(Player, [{
		key: 'loadFile',
		value: function loadFile(path) {
			var fs = require('fs');
			this.buffer = fs.readFileSync(path);
			return this.fileLoaded();
		}
	}, {
		key: 'loadArrayBuffer',
		value: function loadArrayBuffer(arrayBuffer) {
			this.buffer = new Uint8Array(arrayBuffer);
			return this.fileLoaded();
		}
	}, {
		key: 'loadDataUri',
		value: function loadDataUri(dataUri) {
			var byteString = Utils.atob(dataUri.split(',')[1]);

			var ia = new Uint8Array(byteString.length);
			for (var i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}

			this.buffer = ia;
			return this.fileLoaded();
		}
	}, {
		key: 'getFilesize',
		value: function getFilesize() {
			return this.buffer ? this.buffer.length : 0;
		}
	}, {
		key: 'fileLoaded',
		value: function fileLoaded() {
			if (!this.validate()) throw 'Invalid MIDI file; should start with MThd';
			return this.getDivision().getFormat().getTracks().dryRun();
		}
	}, {
		key: 'validate',
		value: function validate() {
			return Utils.bytesToLetters(this.buffer.slice(0, 4)) === 'MThd';
		}
	}, {
		key: 'getFormat',
		value: function getFormat() {

			this.format = Utils.bytesToNumber(this.buffer.slice(8, 10));
			return this;
		}
	}, {
		key: 'getTracks',
		value: function getTracks() {
			this.tracks = [];
			this.buffer.forEach(function (byte, index) {
				if (Utils.bytesToLetters(this.buffer.slice(index, index + 4)) == 'MTrk') {
					var trackLength = Utils.bytesToNumber(this.buffer.slice(index + 4, index + 8));
					this.tracks.push(new Track(this.tracks.length, this.buffer.slice(index + 8, index + 8 + trackLength)));
				}
			}, this);

			return this;
		}
	}, {
		key: 'enableTrack',
		value: function enableTrack(trackNumber) {
			this.tracks[trackNumber - 1].enable();
			return this;
		}
	}, {
		key: 'disableTrack',
		value: function disableTrack(trackNumber) {
			this.tracks[trackNumber - 1].disable();
			return this;
		}
	}, {
		key: 'getDivision',
		value: function getDivision() {
			this.division = Utils.bytesToNumber(this.buffer.slice(12, 14));
			return this;
		}
	}, {
		key: 'playLoop',
		value: function playLoop(dryRun) {
			if (!this.inLoop) {
				this.inLoop = true;
				this.tick = this.getCurrentTick();

				this.tracks.forEach(function (track) {
					if (!dryRun && this.endOfFile()) {
						this.triggerPlayerEvent('endOfFile');
						this.stop();
					} else {
						var _event = track.handleEvent(this.tick, dryRun);

						if (dryRun && _event && _event.hasOwnProperty('name') && _event.name === 'Set Tempo') {
							this.tempo = _event.data;
						}

						if (_event && !dryRun) this.emitEvent(_event);
					}
				}, this);

				if (!dryRun) this.triggerPlayerEvent('playing', { tick: this.tick });
				this.inLoop = false;
			}
		}
	}, {
		key: 'setStartTime',
		value: function setStartTime(startTime) {
			this.startTime = startTime;
		}
	}, {
		key: 'play',
		value: function play() {
			if (this.isPlaying()) throw 'Already playing...';

			if (!this.startTime) this.startTime = new Date().getTime();

			this.setIntervalId = setInterval(this.playLoop.bind(this), this.sampleRate);

			return this;
		}
	}, {
		key: 'pause',
		value: function pause() {
			clearInterval(this.setIntervalId);
			this.setIntervalId = false;
			this.startTick = this.tick;
			this.startTime = 0;
			return this;
		}
	}, {
		key: 'stop',
		value: function stop() {
			clearInterval(this.setIntervalId);
			this.setIntervalId = false;
			this.startTick = 0;
			this.startTime = 0;
			this.resetTracks();
			return this;
		}
	}, {
		key: 'skipToTick',
		value: function skipToTick(tick) {
			this.stop();
			this.startTick = tick;

			this.tracks.forEach(function (track) {
				track.setEventIndexByTick(tick);
			});
			return this;
		}
	}, {
		key: 'skipToPercent',
		value: function skipToPercent(percent) {
			if (percent < 0 || percent > 100) throw "Percent must be number between 1 and 100.";
			this.skipToTick(Math.round(percent / 100 * this.totalTicks));
			return this;
		}
	}, {
		key: 'skipToSeconds',
		value: function skipToSeconds(seconds) {
			var songTime = this.getSongTime();
			if (seconds < 0 || seconds > songTime) throw seconds + " seconds not within song time of " + songTime;
			this.skipToPercent(seconds / songTime * 100);
			return this;
		}
	}, {
		key: 'isPlaying',
		value: function isPlaying() {
			return this.setIntervalId > 0 || _typeof(this.setIntervalId) === 'object';
		}
	}, {
		key: 'dryRun',
		value: function dryRun() {
			this.resetTracks();
			while (!this.endOfFile()) {
				this.playLoop(true);
			}this.events = this.getEvents();
			this.totalEvents = this.getTotalEvents();
			this.totalTicks = this.getTotalTicks();
			this.startTick = 0;
			this.startTime = 0;

			this.resetTracks();

			this.triggerPlayerEvent('fileLoaded', this);
			return this;
		}
	}, {
		key: 'resetTracks',
		value: function resetTracks() {
			this.tracks.forEach(function (track) {
				return track.reset();
			});
			return this;
		}
	}, {
		key: 'getEvents',
		value: function getEvents() {
			return this.tracks.map(function (track) {
				return track.events;
			});
		}
	}, {
		key: 'getTotalTicks',
		value: function getTotalTicks() {
			return Math.max.apply(null, this.tracks.map(function (track) {
				return track.delta;
			}));
		}
	}, {
		key: 'getTotalEvents',
		value: function getTotalEvents() {
			return this.tracks.reduce(function (a, b) {
				return { events: { length: a.events.length + b.events.length } };
			}, { events: { length: 0 } }).events.length;
		}
	}, {
		key: 'getSongTime',
		value: function getSongTime() {
			return this.totalTicks / this.division / this.tempo * 60;
		}
	}, {
		key: 'getSongTimeRemaining',
		value: function getSongTimeRemaining() {
			return Math.round((this.totalTicks - this.tick) / this.division / this.tempo * 60);
		}
	}, {
		key: 'getSongPercentRemaining',
		value: function getSongPercentRemaining() {
			return Math.round(this.getSongTimeRemaining() / this.getSongTime() * 100);
		}
	}, {
		key: 'bytesProcessed',
		value: function bytesProcessed() {
			return 14 + this.tracks.length * 8 + this.tracks.reduce(function (a, b) {
				return { pointer: a.pointer + b.pointer };
			}, { pointer: 0 }).pointer;
		}
	}, {
		key: 'eventsPlayed',
		value: function eventsPlayed() {
			return this.tracks.reduce(function (a, b) {
				return { eventIndex: a.eventIndex + b.eventIndex };
			}, { eventIndex: 0 }).eventIndex;
		}
	}, {
		key: 'endOfFile',
		value: function endOfFile() {
			if (this.isPlaying()) {
				return this.eventsPlayed() == this.totalEvents;
			}

			return this.bytesProcessed() == this.buffer.length;
		}
	}, {
		key: 'getCurrentTick',
		value: function getCurrentTick() {
			return Math.round((new Date().getTime() - this.startTime) / 1000 * (this.division * (this.tempo / 60))) + this.startTick;
		}
	}, {
		key: 'emitEvent',
		value: function emitEvent(event) {
			this.triggerPlayerEvent('midiEvent', event);
			return this;
		}
	}, {
		key: 'on',
		value: function on(playerEvent, fn) {
			if (!this.eventListeners.hasOwnProperty(playerEvent)) this.eventListeners[playerEvent] = [];
			this.eventListeners[playerEvent].push(fn);
			return this;
		}
	}, {
		key: 'triggerPlayerEvent',
		value: function triggerPlayerEvent(playerEvent, data) {
			if (this.eventListeners.hasOwnProperty(playerEvent)) this.eventListeners[playerEvent].forEach(function (fn) {
				return fn(data || {});
			});
			return this;
		}
	}]);

	return Player;
}();

exports.Player = Player;

var Track = function () {
	function Track(index, data) {
		_classCallCheck(this, Track);

		this.enabled = true;
		this.eventIndex = 0;
		this.pointer = 0;
		this.lastTick = 0;
		this.lastStatus = null;
		this.index = index;
		this.data = data;
		this.delta = 0;
		this.runningDelta = 0;
		this.events = [];
	}

	_createClass(Track, [{
		key: 'reset',
		value: function reset() {
			this.enabled = true;
			this.eventIndex = 0;
			this.pointer = 0;
			this.lastTick = 0;
			this.lastStatus = null;
			this.delta = 0;
			this.runningDelta = 0;
			return this;
		}
	}, {
		key: 'enable',
		value: function enable() {
			this.enabled = true;
			return this;
		}
	}, {
		key: 'disable',
		value: function disable() {
			this.enabled = false;
			return this;
		}
	}, {
		key: 'setEventIndexByTick',
		value: function setEventIndexByTick(tick) {
			tick = tick || 0;

			for (var i in this.events) {
				if (this.events[i].tick >= tick) {
					this.eventIndex = i;
					return this;
				}
			}
		}
	}, {
		key: 'getCurrentByte',
		value: function getCurrentByte() {
			return this.data[this.pointer];
		}
	}, {
		key: 'getDeltaByteCount',
		value: function getDeltaByteCount() {
			var currentByte = this.getCurrentByte();
			var byteCount = 1;

			while (currentByte >= 128) {
				currentByte = this.data[this.pointer + byteCount];
				byteCount++;
			}

			return byteCount;
		}
	}, {
		key: 'getDelta',
		value: function getDelta() {
			return Utils.readVarInt(this.data.slice(this.pointer, this.pointer + this.getDeltaByteCount()));
		}
	}, {
		key: 'handleEvent',
		value: function handleEvent(currentTick, dryRun) {
			dryRun = dryRun || false;

			if (dryRun) {
				var elapsedTicks = currentTick - this.lastTick;
				var delta = this.getDelta();
				var eventReady = elapsedTicks >= delta;

				if (this.pointer < this.data.length && (dryRun || eventReady)) {
					var _event2 = this.parseEvent();
					if (this.enabled) return _event2;
				}
			} else {
				if (this.events[this.eventIndex] && this.events[this.eventIndex].tick <= currentTick) {
					this.eventIndex++;
					if (this.enabled) return this.events[this.eventIndex - 1];
				}
			}

			return null;
		}
	}, {
		key: 'getStringData',
		value: function getStringData(eventStartIndex) {
			var currentByte = this.pointer;
			var byteCount = 1;
			var length = Utils.readVarInt(this.data.slice(eventStartIndex + 2, eventStartIndex + 2 + byteCount));
			var stringLength = length;

			return Utils.bytesToLetters(this.data.slice(eventStartIndex + byteCount + 2, eventStartIndex + byteCount + length + 2));
		}
	}, {
		key: 'parseEvent',
		value: function parseEvent() {
			var eventStartIndex = this.pointer + this.getDeltaByteCount();
			var eventJson = {};
			var deltaByteCount = this.getDeltaByteCount();
			eventJson.track = this.index + 1;
			eventJson.delta = this.getDelta();
			this.lastTick = this.lastTick + eventJson.delta;
			this.runningDelta += eventJson.delta;
			eventJson.tick = this.runningDelta;
			eventJson.byteIndex = this.pointer;

			if (this.data[eventStartIndex] == 0xff) {

				switch (this.data[eventStartIndex + 1]) {
					case 0x00:
						eventJson.name = 'Sequence Number';
						break;
					case 0x01:
						eventJson.name = 'Text Event';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x02:
						eventJson.name = 'Copyright Notice';
						break;
					case 0x03:
						eventJson.name = 'Sequence/Track Name';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x04:
						eventJson.name = 'Instrument Name';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x05:
						eventJson.name = 'Lyric';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x06:
						eventJson.name = 'Marker';
						break;
					case 0x07:
						eventJson.name = 'Cue Point';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x09:
						eventJson.name = 'Device Name';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x20:
						eventJson.name = 'MIDI Channel Prefix';
						break;
					case 0x21:
						eventJson.name = 'MIDI Port';
						eventJson.data = Utils.bytesToNumber([this.data[eventStartIndex + 3]]);
						break;
					case 0x2F:
						eventJson.name = 'End of Track';
						break;
					case 0x51:
						eventJson.name = 'Set Tempo';
						eventJson.data = Math.round(60000000 / Utils.bytesToNumber(this.data.slice(eventStartIndex + 3, eventStartIndex + 6)));
						this.tempo = eventJson.data;
						break;
					case 0x54:
						eventJson.name = 'SMTPE Offset';
						break;
					case 0x58:
						eventJson.name = 'Time Signature';
						break;
					case 0x59:
						eventJson.name = 'Key Signature';
						break;
					case 0x7F:
						eventJson.name = 'Sequencer-Specific Meta-event';
						break;
					default:
						eventJson.name = 'Unknown: ' + this.data[eventStartIndex + 1].toString(16);
						break;
				}

				var length = this.data[this.pointer + deltaByteCount + 2];


				this.pointer += deltaByteCount + 3 + length;
			} else if (this.data[eventStartIndex] == 0xf0) {
				eventJson.name = 'Sysex';
				var length = this.data[this.pointer + deltaByteCount + 1];
				this.pointer += deltaByteCount + 2 + length;
			} else {
				if (this.data[eventStartIndex] < 0x80) {
					eventJson.running = true;
					eventJson.noteNumber = this.data[eventStartIndex];
					eventJson.noteName = Constants.NOTES[this.data[eventStartIndex]];
					eventJson.velocity = this.data[eventStartIndex + 1];

					if (this.lastStatus <= 0x8f) {
						eventJson.name = 'Note off';
						eventJson.channel = this.lastStatus - 0x80 + 1;
					} else if (this.lastStatus <= 0x9f) {
						eventJson.name = 'Note on';
						eventJson.channel = this.lastStatus - 0x90 + 1;
					}

					this.pointer += deltaByteCount + 2;
				} else {
					this.lastStatus = this.data[eventStartIndex];

					if (this.data[eventStartIndex] <= 0x8f) {
						eventJson.name = 'Note off';
						eventJson.channel = this.lastStatus - 0x80 + 1;
						eventJson.noteNumber = this.data[eventStartIndex + 1];
						eventJson.noteName = Constants.NOTES[this.data[eventStartIndex + 1]];
						eventJson.velocity = Math.round(this.data[eventStartIndex + 2] / 127 * 100);
						this.pointer += deltaByteCount + 3;
					} else if (this.data[eventStartIndex] <= 0x9f) {
						eventJson.name = 'Note on';
						eventJson.channel = this.lastStatus - 0x90 + 1;
						eventJson.noteNumber = this.data[eventStartIndex + 1];
						eventJson.noteName = Constants.NOTES[this.data[eventStartIndex + 1]];
						eventJson.velocity = Math.round(this.data[eventStartIndex + 2] / 127 * 100);
						this.pointer += deltaByteCount + 3;
					} else if (this.data[eventStartIndex] <= 0xaf) {
						eventJson.name = 'Polyphonic Key Pressure';
						eventJson.channel = this.lastStatus - 0xa0 + 1;
						eventJson.note = Constants.NOTES[this.data[eventStartIndex + 1]];
						eventJson.pressure = event[2];
						this.pointer += deltaByteCount + 3;
					} else if (this.data[eventStartIndex] <= 0xbf) {
						eventJson.name = 'Controller Change';
						eventJson.channel = this.lastStatus - 0xb0 + 1;
						eventJson.number = this.data[eventStartIndex + 1];
						eventJson.value = this.data[eventStartIndex + 2];
						this.pointer += deltaByteCount + 3;
					} else if (this.data[eventStartIndex] <= 0xcf) {
						eventJson.name = 'Program Change';
						eventJson.channel = this.lastStatus - 0xc0 + 1;
						this.pointer += deltaByteCount + 2;
					} else if (this.data[eventStartIndex] <= 0xdf) {
						eventJson.name = 'Channel Key Pressure';
						eventJson.channel = this.lastStatus - 0xd0 + 1;
						this.pointer += deltaByteCount + 2;
					} else if (this.data[eventStartIndex] <= 0xef) {
						eventJson.name = 'Pitch Bend';
						eventJson.channel = this.lastStatus - 0xe0 + 1;
						this.pointer += deltaByteCount + 3;
					} else {
						eventJson.name = 'Unknown.  Pointer: ' + this.pointer.toString() + ' ' + eventStartIndex.toString() + ' ' + this.data.length;
					}
				}
			}

			this.delta += eventJson.delta;
			this.events.push(eventJson);

			return eventJson;
		}
	}, {
		key: 'endOfTrack',
		value: function endOfTrack() {
			if (this.data[this.pointer + 1] == 0xff && this.data[this.pointer + 2] == 0x2f && this.data[this.pointer + 3] == 0x00) {
				return true;
			}

			return false;
		}
	}]);

	return Track;
}();

var Utils = function () {
	function Utils() {
		_classCallCheck(this, Utils);
	}

	_createClass(Utils, null, [{
		key: 'byteToHex',
		value: function byteToHex(byte) {
			return ('0' + byte.toString(16)).slice(-2);
		}
	}, {
		key: 'bytesToHex',
		value: function bytesToHex(byteArray) {
			var hex = [];
			byteArray.forEach(function (byte) {
				return hex.push(Utils.byteToHex(byte));
			});
			return hex.join('');
		}
	}, {
		key: 'hexToNumber',
		value: function hexToNumber(hexString) {
			return parseInt(hexString, 16);
		}
	}, {
		key: 'bytesToNumber',
		value: function bytesToNumber(byteArray) {
			return Utils.hexToNumber(Utils.bytesToHex(byteArray));
		}
	}, {
		key: 'bytesToLetters',
		value: function bytesToLetters(byteArray) {
			var letters = [];
			byteArray.forEach(function (byte) {
				return letters.push(String.fromCharCode(byte));
			});
			return letters.join('');
		}
	}, {
		key: 'decToBinary',
		value: function decToBinary(dec) {
			return (dec >>> 0).toString(2);
		}
	}, {
		key: 'readVarInt',
		value: function readVarInt(byteArray) {
			var result = 0;
			byteArray.forEach(function (number) {
				var b = number;
				if (b & 0x80) {
					result += b & 0x7f;
					result <<= 7;
				} else {
					result += b;
				}
			});

			return result;
		}
	}, {
		key: 'atob',
		value: function (_atob) {
			function atob(_x) {
				return _atob.apply(this, arguments);
			}

			atob.toString = function () {
				return _atob.toString();
			};

			return atob;
		}(function (string) {
			if (typeof atob === 'function') return atob(string);
			return new Buffer(string, 'base64').toString('binary');
		})
	}]);

	return Utils;
}();

exports.Utils = Utils;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbIkNvbnN0YW50cyIsIlZFUlNJT04iLCJOT1RFUyIsImFsbE5vdGVzIiwiY291bnRlciIsImkiLCJmb3JFYWNoIiwibm90ZUdyb3VwIiwibm90ZSIsImV4cG9ydHMiLCJQbGF5ZXIiLCJldmVudEhhbmRsZXIiLCJidWZmZXIiLCJzYW1wbGVSYXRlIiwic3RhcnRUaW1lIiwiZGl2aXNpb24iLCJmb3JtYXQiLCJzZXRJbnRlcnZhbElkIiwidHJhY2tzIiwidGVtcG8iLCJzdGFydFRpY2siLCJ0aWNrIiwibGFzdFRpY2siLCJpbkxvb3AiLCJ0b3RhbFRpY2tzIiwiZXZlbnRzIiwidG90YWxFdmVudHMiLCJldmVudExpc3RlbmVycyIsIm9uIiwicGF0aCIsImZzIiwicmVxdWlyZSIsInJlYWRGaWxlU3luYyIsImZpbGVMb2FkZWQiLCJhcnJheUJ1ZmZlciIsIlVpbnQ4QXJyYXkiLCJkYXRhVXJpIiwiYnl0ZVN0cmluZyIsIlV0aWxzIiwiYXRvYiIsInNwbGl0IiwiaWEiLCJsZW5ndGgiLCJjaGFyQ29kZUF0IiwidmFsaWRhdGUiLCJnZXREaXZpc2lvbiIsImdldEZvcm1hdCIsImdldFRyYWNrcyIsImRyeVJ1biIsImJ5dGVzVG9MZXR0ZXJzIiwic2xpY2UiLCJieXRlc1RvTnVtYmVyIiwiYnl0ZSIsImluZGV4IiwidHJhY2tMZW5ndGgiLCJwdXNoIiwiVHJhY2siLCJ0cmFja051bWJlciIsImVuYWJsZSIsImRpc2FibGUiLCJnZXRDdXJyZW50VGljayIsInRyYWNrIiwiZW5kT2ZGaWxlIiwidHJpZ2dlclBsYXllckV2ZW50Iiwic3RvcCIsImV2ZW50IiwiaGFuZGxlRXZlbnQiLCJoYXNPd25Qcm9wZXJ0eSIsIm5hbWUiLCJkYXRhIiwiZW1pdEV2ZW50IiwiaXNQbGF5aW5nIiwiRGF0ZSIsImdldFRpbWUiLCJzZXRJbnRlcnZhbCIsInBsYXlMb29wIiwiYmluZCIsImNsZWFySW50ZXJ2YWwiLCJyZXNldFRyYWNrcyIsInNldEV2ZW50SW5kZXhCeVRpY2siLCJwZXJjZW50Iiwic2tpcFRvVGljayIsIk1hdGgiLCJyb3VuZCIsInNlY29uZHMiLCJzb25nVGltZSIsImdldFNvbmdUaW1lIiwic2tpcFRvUGVyY2VudCIsImdldEV2ZW50cyIsImdldFRvdGFsRXZlbnRzIiwiZ2V0VG90YWxUaWNrcyIsInJlc2V0IiwibWFwIiwibWF4IiwiYXBwbHkiLCJkZWx0YSIsInJlZHVjZSIsImEiLCJiIiwiZ2V0U29uZ1RpbWVSZW1haW5pbmciLCJwb2ludGVyIiwiZXZlbnRJbmRleCIsImV2ZW50c1BsYXllZCIsImJ5dGVzUHJvY2Vzc2VkIiwicGxheWVyRXZlbnQiLCJmbiIsImVuYWJsZWQiLCJsYXN0U3RhdHVzIiwicnVubmluZ0RlbHRhIiwiY3VycmVudEJ5dGUiLCJnZXRDdXJyZW50Qnl0ZSIsImJ5dGVDb3VudCIsInJlYWRWYXJJbnQiLCJnZXREZWx0YUJ5dGVDb3VudCIsImN1cnJlbnRUaWNrIiwiZWxhcHNlZFRpY2tzIiwiZ2V0RGVsdGEiLCJldmVudFJlYWR5IiwicGFyc2VFdmVudCIsImV2ZW50U3RhcnRJbmRleCIsInN0cmluZ0xlbmd0aCIsImV2ZW50SnNvbiIsImRlbHRhQnl0ZUNvdW50IiwiYnl0ZUluZGV4Iiwic3RyaW5nIiwiZ2V0U3RyaW5nRGF0YSIsInRvU3RyaW5nIiwicnVubmluZyIsIm5vdGVOdW1iZXIiLCJub3RlTmFtZSIsInZlbG9jaXR5IiwiY2hhbm5lbCIsInByZXNzdXJlIiwibnVtYmVyIiwidmFsdWUiLCJieXRlQXJyYXkiLCJoZXgiLCJieXRlVG9IZXgiLCJqb2luIiwiaGV4U3RyaW5nIiwicGFyc2VJbnQiLCJoZXhUb051bWJlciIsImJ5dGVzVG9IZXgiLCJsZXR0ZXJzIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwiZGVjIiwicmVzdWx0IiwiQnVmZmVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUdBLElBQUlBLFlBQVk7QUFDZkMsVUFBUyxPQURNO0FBRWZDLFFBQU87QUFGUSxDQUFoQjs7QUFLQSxD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QUFTLENBQWI7QUFDQVosYUFBVWpJLE9BQVYsQ0FBa0Isa0JBQVU7QUFDM0IsUUFBSTRGLElBQUltQyxNQUFSO0FBQ0EsUUFBSW5DLElBQUksSUFBUixFQUFjO0FBQ2JpRCxlQUFXakQsSUFBSSxJQUFmO0FBQ0FpRCxnQkFBVyxDQUFYO0FBQ0EsS0FIRCxNQUdPO0FBRU5BLGVBQVVqRCxDQUFWO0FBQ0E7QUFDRCxJQVREOztBQVdBLFVBQU9pRCxNQUFQO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Y0FPV3ZCLE0sRUFBUTtBQUNuQixPQUFJLE9BQU9yRixJQUFQLEtBQWdCLFVBQXBCLEVBQWdDLE9BQU9BLEtBQUtxRixNQUFMLENBQVA7QUFDaEMsVUFBTyxJQUFJd0IsTUFBSixDQUFXeEIsTUFBWCxFQUFtQixRQUFuQixFQUE2QkUsUUFBN0IsQ0FBc0MsUUFBdEMsQ0FBUDtBQUNBLEc7Ozs7OztBQUdGckgsUUFBUTZCLEtBQVIsR0FBZ0JBLEtBQWhCIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDb25zdGFudHMgdXNlZCBpbiBwbGF5ZXIuXG4gKi9cbnZhciBDb25zdGFudHMgPSB7XG5cdFZFUlNJT046ICcxLjEuNCcsXG5cdE5PVEVTOiBbXVxufTtcblxuKGZ1bmN0aW9uKCkge1xuXHQvLyBCdWlsZHMgbm90ZXMgb2JqZWN0IGZvciByZWZlcmVuY2UgYWdhaW5zdCBiaW5hcnkgdmFsdWVzLlxuXHR2YXIgYWxsTm90ZXMgPSBbWydDJ10sIFsnQyMnLCdEYiddLCBbJ0QnXSwgWydEIycsJ0ViJ10sIFsnRSddLFsnRiddLCBbJ0YjJywnR2InXSwgWydHJ10sIFsnRyMnLCdBYiddLCBbJ0EnXSwgWydBIycsJ0JiJ10sIFsnQiddXTtcblx0dmFyIGNvdW50ZXIgPSAwO1xuXG5cdC8vIEFsbCBhdmFpbGFibGUgb2N0YXZlcy5cblx0Zm9yIChsZXQgaSA9IC0xOyBpIDw9IDk7IGkrKykge1xuXHRcdGFsbE5vdGVzLmZvckVhY2gobm90ZUdyb3VwID0+IHtcblx0XHRcdG5vdGVHcm91cC5mb3JFYWNoKG5vdGUgPT4gQ29uc3RhbnRzLk5PVEVTW2NvdW50ZXJdID0gbm90ZSArIGkpO1xuXHRcdFx0Y291bnRlciArKztcblx0XHR9KTtcblx0fVxufSkoKTtcblxuZXhwb3J0cy5Db25zdGFudHMgPSBDb25zdGFudHM7LyoqXG4gKiBNYWluIHBsYXllciBjbGFzcy4gIENvbnRhaW5zIG1ldGhvZHMgdG8gbG9hZCBmaWxlcywgc3RhcnQsIHN0b3AuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSAtIENhbGxiYWNrIHRvIGZpcmUgZm9yIGVhY2ggTUlESSBldmVudC4gIENhbiBhbHNvIGJlIGFkZGVkIHdpdGggb24oJ21pZGlFdmVudCcsIGZuKVxuICogQHBhcmFtIHthcnJheX0gLSBBcnJheSBidWZmZXIgb2YgTUlESSBmaWxlIChvcHRpb25hbCkuXG4gKi9cbmNsYXNzIFBsYXllciB7XG5cdGNvbnN0cnVjdG9yKGV2ZW50SGFuZGxlciwgYnVmZmVyKSB7XG5cdFx0dGhpcy5zYW1wbGVSYXRlID0gNTsgLy8gbWlsbGlzZWNvbmRzXG5cdFx0dGhpcy5zdGFydFRpbWUgPSAwO1xuXHRcdHRoaXMuYnVmZmVyID0gYnVmZmVyIHx8IG51bGw7XG5cdFx0dGhpcy5kaXZpc2lvbjtcblx0XHR0aGlzLmZvcm1hdDtcblx0XHR0aGlzLnNldEludGVydmFsSWQgPSBmYWxzZTtcblx0XHR0aGlzLnRyYWNrcyA9IFtdO1xuXHRcdHRoaXMudGVtcG8gPSAxMjA7XG5cdFx0dGhpcy5zdGFydFRpY2sgPSAwO1xuXHRcdHRoaXMudGljayA9IDA7XG5cdFx0dGhpcy5sYXN0VGljayA9IG51bGw7XG5cdFx0dGhpcy5pbkxvb3AgPSBmYWxzZTtcblx0XHR0aGlzLnRvdGFsVGlja3MgPSAwO1xuXHRcdHRoaXMuZXZlbnRzID0gW107XG5cdFx0dGhpcy50b3RhbEV2ZW50cyA9IDA7XG5cdFx0dGhpcy5ldmVudExpc3RlbmVycyA9IHt9O1xuXG5cdFx0aWYgKHR5cGVvZihldmVudEhhbmRsZXIpID09PSAnZnVuY3Rpb24nKSB0aGlzLm9uKCdtaWRpRXZlbnQnLCBldmVudEhhbmRsZXIpO1xuXHR9XG5cblx0LyoqXG5cdCAqIExvYWQgYSBmaWxlIGludG8gdGhlIHBsYXllciAoTm9kZS5qcyBvbmx5KS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHBhdGggLSBQYXRoIG9mIGZpbGUuXG5cdCAqIEByZXR1cm4ge1BsYXllcn1cblx0ICovXG5cdGxvYWRGaWxlKHBhdGgpIHtcblx0XHR2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuXHRcdHRoaXMuYnVmZmVyID0gZnMucmVhZEZpbGVTeW5jKHBhdGgpO1xuXHRcdHJldHVybiB0aGlzLmZpbGVMb2FkZWQoKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBMb2FkIGFuIGFycmF5IGJ1ZmZlciBpbnRvIHRoZSBwbGF5ZXIuXG5cdCAqIEBwYXJhbSB7YXJyYXl9IGFycmF5QnVmZmVyIC0gQXJyYXkgYnVmZmVyIG9mIGZpbGUgdG8gYmUgbG9hZGVkLlxuXHQgKiBAcmV0dXJuIHtQbGF5ZXJ9XG5cdCAqL1xuXHRsb2FkQXJyYXlCdWZmZXIoYXJyYXlCdWZmZXIpIHtcblx0XHR0aGlzLmJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGFycmF5QnVmZmVyKTtcblx0XHRyZXR1cm4gdGhpcy5maWxlTG9hZGVkKCk7XG5cdH1cblxuXHQvKipcblx0ICogTG9hZCBhIGRhdGEgVVJJIGludG8gdGhlIHBsYXllci5cblx0ICogQHBhcmFtIHtzdHJpbmd9IGRhdGFVcmkgLSBEYXRhIFVSSSB0byBiZSBsb2FkZWQuXG5cdCAqIEByZXR1cm4ge1BsYXllcn1cblx0ICovXG5cdGxvYWREYXRhVXJpKGRhdGFVcmkpIHtcblx0XHQvLyBjb252ZXJ0IGJhc2U2NCB0byByYXcgYmluYXJ5IGRhdGEgaGVsZCBpbiBhIHN0cmluZy5cblx0XHQvLyBkb2Vzbid0IGhhbmRsZSBVUkxFbmNvZGVkIERhdGFVUklzIC0gc2VlIFNPIGFuc3dlciAjNjg1MDI3NiBmb3IgY29kZSB0aGF0IGRvZXMgdGhpc1xuXHRcdHZhciBieXRlU3RyaW5nID0gVXRpbHMuYXRvYihkYXRhVXJpLnNwbGl0KCcsJylbMV0pO1xuXG5cdFx0Ly8gd3JpdGUgdGhlIGJ5dGVzIG9mIHRoZSBzdHJpbmcgdG8gYW4gQXJyYXlCdWZmZXJcblx0XHR2YXIgaWEgPSBuZXcgVWludDhBcnJheShieXRlU3RyaW5nLmxlbmd0aCk7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBieXRlU3RyaW5nLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpYVtpXSA9IGJ5dGVTdHJpbmcuY2hhckNvZGVBdChpKTtcblx0XHR9XG5cblx0XHR0aGlzLmJ1ZmZlciA9IGlhO1xuXHRcdHJldHVybiB0aGlzLmZpbGVMb2FkZWQoKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZXQgZmlsZXNpemUgb2YgbG9hZGVkIGZpbGUgaW4gbnVtYmVyIG9mIGJ5dGVzLlxuXHQgKiBAcmV0dXJuIHtudW1iZXJ9IC0gVGhlIGZpbGVzaXplLlxuXHQgKi9cblx0Z2V0RmlsZXNpemUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuYnVmZmVyID8gdGhpcy5idWZmZXIubGVuZ3RoIDogMDtcblx0fVxuXG5cdC8qKlxuXHQgKiBQYXJzZXMgZmlsZSBmb3IgbmVjZXNzYXJ5IGluZm9ybWF0aW9uIGFuZCBkb2VzIGEgZHJ5IHJ1biB0byBjYWxjdWxhdGUgdG90YWwgbGVuZ3RoLlxuXHQgKiBQb3B1bGF0ZXMgdGhpcy5ldmVudHMgJiB0aGlzLnRvdGFsVGlja3MuXG5cdCAqIEByZXR1cm4ge1BsYXllcn1cblx0ICovXG5cdGZpbGVMb2FkZWQoKSB7XG5cdFx0aWYgKCF0aGlzLnZhbGlkYXRlKCkpIHRocm93ICdJbnZhbGlkIE1JREkgZmlsZTsgc2hvdWxkIHN0YXJ0IHdpdGggTVRoZCc7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0RGl2aXNpb24oKS5nZXRGb3JtYXQoKS5nZXRUcmFja3MoKS5kcnlSdW4oKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBWYWxpZGF0ZXMgZmlsZSB1c2luZyBzaW1wbGUgbWVhbnMgLSBmaXJzdCBmb3VyIGJ5dGVzIHNob3VsZCA9PSBNVGhkLlxuXHQgKiBAcmV0dXJuIHtib29sZWFufVxuXHQgKi9cblx0dmFsaWRhdGUoKSB7XG5cdFx0cmV0dXJuIFV0aWxzLmJ5dGVzVG9MZXR0ZXJzKHRoaXMuYnVmZmVyLnNsaWNlKDAsIDQpKSA9PT0gJ01UaGQnO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldHMgTUlESSBmaWxlIGZvcm1hdCBmb3IgbG9hZGVkIGZpbGUuXG5cdCAqIEByZXR1cm4ge1BsYXllcn1cblx0ICovXG5cdGdldEZvcm1hdCgpIHtcblx0XHQvKlxuXHRcdE1JREkgZmlsZXMgY29tZSBpbiAzIHZhcmlhdGlvbnM6XG5cdFx0Rm9ybWF0IDAgd2hpY2ggY29udGFpbiBhIHNpbmdsZSB0cmFja1xuXHRcdEZvcm1hdCAxIHdoaWNoIGNvbnRhaW4gb25lIG9yIG1vcmUgc2ltdWx0YW5lb3VzIHRyYWNrc1xuXHRcdChpZSBhbGwgdHJhY2tzIGFyZSB0byBiZSBwbGF5ZWQgc2ltdWx0YW5lb3VzbHkpLlxuXHRcdEZvcm1hdCAyIHdoaWNoIGNvbnRhaW4gb25lIG9yIG1vcmUgaW5kZXBlbmRhbnQgdHJhY2tzXG5cdFx0KGllIGVhY2ggdHJhY2sgaXMgdG8gYmUgcGxheWVkIGluZGVwZW5kYW50bHkgb2YgdGhlIG90aGVycykuXG5cdFx0cmV0dXJuIFV0aWxzLmJ5dGVzVG9OdW1iZXIodGhpcy5idWZmZXIuc2xpY2UoOCwgMTApKTtcblx0XHQqL1xuXG5cdFx0dGhpcy5mb3JtYXQgPSBVdGlscy5ieXRlc1RvTnVtYmVyKHRoaXMuYnVmZmVyLnNsaWNlKDgsIDEwKSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvKipcblx0ICogUGFyc2VzIG91dCB0cmFja3MsIHBsYWNlcyB0aGVtIGluIHRoaXMudHJhY2tzIGFuZCBpbml0aWFsaXplcyB0aGlzLnBvaW50ZXJzXG5cdCAqIEByZXR1cm4ge1BsYXllcn1cblx0ICovXG5cdGdldFRyYWNrcygpIHtcblx0XHR0aGlzLnRyYWNrcyA9IFtdO1xuXHRcdHRoaXMuYnVmZmVyLmZvckVhY2goZnVuY3Rpb24oYnl0ZSwgaW5kZXgpIHtcblx0XHRcdGlmIChVdGlscy5ieXRlc1RvTGV0dGVycyh0aGlzLmJ1ZmZlci5zbGljZShpbmRleCwgaW5kZXggKyA0KSkgPT0gJ01UcmsnKSB7XG5cdFx0XHRcdGxldCB0cmFja0xlbmd0aCA9IFV0aWxzLmJ5dGVzVG9OdW1iZXIodGhpcy5idWZmZXIuc2xpY2UoaW5kZXggKyA0LCBpbmRleCArIDgpKTtcblx0XHRcdFx0dGhpcy50cmFja3MucHVzaChuZXcgVHJhY2sodGhpcy50cmFja3MubGVuZ3RoLCB0aGlzLmJ1ZmZlci5zbGljZShpbmRleCArIDgsIGluZGV4ICsgOCArIHRyYWNrTGVuZ3RoKSkpO1xuXHRcdFx0fVxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvKipcblx0ICogRW5hYmxlcyBhIHRyYWNrIGZvciBwbGF5aW5nLlxuXHQgKiBAcGFyYW0ge251bWJlcn0gdHJhY2tOdW1iZXIgLSBUcmFjayBudW1iZXJcblx0ICogQHJldHVybiB7UGxheWVyfVxuXHQgKi9cblx0ZW5hYmxlVHJhY2sodHJhY2tOdW1iZXIpIHtcblx0XHR0aGlzLnRyYWNrc1t0cmFja051bWJlciAtIDFdLmVuYWJsZSgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIERpc2FibGVzIGEgdHJhY2sgZm9yIHBsYXlpbmcuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSAtIFRyYWNrIG51bWJlclxuXHQgKiBAcmV0dXJuIHtQbGF5ZXJ9XG5cdCAqL1xuXHRkaXNhYmxlVHJhY2sodHJhY2tOdW1iZXIpIHtcblx0XHR0aGlzLnRyYWNrc1t0cmFja051bWJlciAtIDFdLmRpc2FibGUoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBHZXRzIHF1YXJ0ZXIgbm90ZSBkaXZpc2lvbiBvZiBsb2FkZWQgTUlESSBmaWxlLlxuXHQgKiBAcmV0dXJuIHtQbGF5ZXJ9XG5cdCAqL1xuXHRnZXREaXZpc2lvbigpIHtcblx0XHR0aGlzLmRpdmlzaW9uID0gVXRpbHMuYnl0ZXNUb051bWJlcih0aGlzLmJ1ZmZlci5zbGljZSgxMiwgMTQpKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBUaGUgbWFpbiBwbGF5IGxvb3AuXG5cdCAqIEBwYXJhbSB7Ym9vbGVhbn0gLSBJbmRpY2F0ZXMgd2hldGhlciBvciBub3QgdGhpcyBpcyBiZWluZyBjYWxsZWQgc2ltcGx5IGZvciBwYXJzaW5nIHB1cnBvc2VzLiAgRGlzcmVnYXJkcyB0aW1pbmcgaWYgc28uXG5cdCAqIEByZXR1cm4ge3VuZGVmaW5lZH1cblx0ICovXG5cdHBsYXlMb29wKGRyeVJ1bikge1xuXHRcdGlmICghdGhpcy5pbkxvb3ApIHtcblx0XHRcdHRoaXMuaW5Mb29wID0gdHJ1ZTtcblx0XHRcdHRoaXMudGljayA9IHRoaXMuZ2V0Q3VycmVudFRpY2soKTtcblxuXHRcdFx0dGhpcy50cmFja3MuZm9yRWFjaChmdW5jdGlvbih0cmFjaykge1xuXHRcdFx0XHQvLyBIYW5kbGUgbmV4dCBldmVudFxuXHRcdFx0XHRpZiAoIWRyeVJ1biAmJiB0aGlzLmVuZE9mRmlsZSgpKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZW5kIG9mIGZpbGUnKVxuXHRcdFx0XHRcdHRoaXMudHJpZ2dlclBsYXllckV2ZW50KCdlbmRPZkZpbGUnKTtcblx0XHRcdFx0XHR0aGlzLnN0b3AoKTtcblxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGxldCBldmVudCA9IHRyYWNrLmhhbmRsZUV2ZW50KHRoaXMudGljaywgZHJ5UnVuKTtcblxuXHRcdFx0XHRcdGlmIChkcnlSdW4gJiYgZXZlbnQgJiYgZXZlbnQuaGFzT3duUHJvcGVydHkoJ25hbWUnKSAmJiBldmVudC5uYW1lID09PSAnU2V0IFRlbXBvJykge1xuXHRcdFx0XHRcdFx0Ly8gR3JhYiB0ZW1wbyBpZiBhdmFpbGFibGUuXG5cdFx0XHRcdFx0XHR0aGlzLnRlbXBvID0gZXZlbnQuZGF0YTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoZXZlbnQgJiYgIWRyeVJ1bikgdGhpcy5lbWl0RXZlbnQoZXZlbnQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0sIHRoaXMpO1xuXG5cdFx0XHRpZiAoIWRyeVJ1bikgdGhpcy50cmlnZ2VyUGxheWVyRXZlbnQoJ3BsYXlpbmcnLCB7dGljazogdGhpcy50aWNrfSk7XG5cdFx0XHR0aGlzLmluTG9vcCA9IGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBTZXR0ZXIgZm9yIHN0YXJ0VGltZS5cblx0ICogQHBhcmFtIHtudW1iZXJ9IC0gVVRDIHRpbWVzdGFtcFxuXHQgKi9cblx0c2V0U3RhcnRUaW1lKHN0YXJ0VGltZSkge1xuXHRcdHRoaXMuc3RhcnRUaW1lID0gc3RhcnRUaW1lO1xuXHR9XG5cblx0LyoqXG5cdCAqIFN0YXJ0IHBsYXlpbmcgbG9hZGVkIE1JREkgZmlsZSBpZiBub3QgYWxyZWFkeSBwbGF5aW5nLlxuXHQgKiBAcmV0dXJuIHtQbGF5ZXJ9XG5cdCAqL1xuXHRwbGF5KCkge1xuXHRcdGlmICh0aGlzLmlzUGxheWluZygpKSB0aHJvdyAnQWxyZWFkeSBwbGF5aW5nLi4uJztcblxuXHRcdC8vIEluaXRpYWxpemVcblx0XHRpZiAoIXRoaXMuc3RhcnRUaW1lKSB0aGlzLnN0YXJ0VGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG5cblx0XHQvLyBTdGFydCBwbGF5IGxvb3Bcblx0XHQvL3dpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5wbGF5TG9vcC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLnNldEludGVydmFsSWQgPSBzZXRJbnRlcnZhbCh0aGlzLnBsYXlMb29wLmJpbmQodGhpcyksIHRoaXMuc2FtcGxlUmF0ZSk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBQYXVzZXMgcGxheWJhY2sgaWYgcGxheWluZy5cblx0ICogQHJldHVybiB7UGxheWVyfVxuXHQgKi9cblx0cGF1c2UoKSB7XG5cdFx0Y2xlYXJJbnRlcnZhbCh0aGlzLnNldEludGVydmFsSWQpO1xuXHRcdHRoaXMuc2V0SW50ZXJ2YWxJZCA9IGZhbHNlO1xuXHRcdHRoaXMuc3RhcnRUaWNrID0gdGhpcy50aWNrO1xuXHRcdHRoaXMuc3RhcnRUaW1lID0gMDtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBTdG9wcyBwbGF5YmFjayBpZiBwbGF5aW5nLlxuXHQgKiBAcmV0dXJuIHtQbGF5ZXJ9XG5cdCAqL1xuXHRzdG9wKCkge1xuXHRcdGNsZWFySW50ZXJ2YWwodGhpcy5zZXRJbnRlcnZhbElkKTtcblx0XHR0aGlzLnNldEludGVydmFsSWQgPSBmYWxzZTtcblx0XHR0aGlzLnN0YXJ0VGljayA9IDA7XG5cdFx0dGhpcy5zdGFydFRpbWUgPSAwO1xuXHRcdHRoaXMucmVzZXRUcmFja3MoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBTa2lwcyBwbGF5ZXIgcG9pbnRlciB0byBzcGVjaWZpZWQgdGljay5cblx0ICogQHBhcmFtIHtudW1iZXJ9IC0gVGljayB0byBza2lwIHRvLlxuXHQgKiBAcmV0dXJuIHtQbGF5ZXJ9XG5cdCAqL1xuXHRza2lwVG9UaWNrKHRpY2spIHtcblx0XHR0aGlzLnN0b3AoKTtcblx0XHR0aGlzLnN0YXJ0VGljayA9IHRpY2s7XG5cblx0XHQvLyBOZWVkIHRvIHNldCB0cmFjayBldmVudCBpbmRleGVzIHRvIHRoZSBuZWFyZXN0IHBvc3NpYmxlIGV2ZW50IHRvIHRoZSBzcGVjaWZpZWQgdGljay5cblx0XHR0aGlzLnRyYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrKSB7XG5cdFx0XHR0cmFjay5zZXRFdmVudEluZGV4QnlUaWNrKHRpY2spO1xuXHRcdH0pO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIFNraXBzIHBsYXllciBwb2ludGVyIHRvIHNwZWNpZmllZCBwZXJjZW50YWdlLlxuXHQgKiBAcGFyYW0ge251bWJlcn0gLSBQZXJjZW50IHZhbHVlIGluIGludGVnZXIgZm9ybWF0LlxuXHQgKiBAcmV0dXJuIHtQbGF5ZXJ9XG5cdCAqL1xuXHRza2lwVG9QZXJjZW50KHBlcmNlbnQpIHtcblx0XHRpZiAocGVyY2VudCA8IDAgfHwgcGVyY2VudCA+IDEwMCkgdGhyb3cgXCJQZXJjZW50IG11c3QgYmUgbnVtYmVyIGJldHdlZW4gMSBhbmQgMTAwLlwiO1xuXHRcdHRoaXMuc2tpcFRvVGljayhNYXRoLnJvdW5kKHBlcmNlbnQgLyAxMDAgKiB0aGlzLnRvdGFsVGlja3MpKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBTa2lwcyBwbGF5ZXIgcG9pbnRlciB0byBzcGVjaWZpZWQgc2Vjb25kcy5cblx0ICogQHBhcmFtIHtudW1iZXJ9IC0gU2Vjb25kcyB0byBza2lwIHRvLlxuXHQgKiBAcmV0dXJuIHtQbGF5ZXJ9XG5cdCAqL1xuXHRza2lwVG9TZWNvbmRzKHNlY29uZHMpIHtcblx0XHR2YXIgc29uZ1RpbWUgPSB0aGlzLmdldFNvbmdUaW1lKCk7XG5cdFx0aWYgKHNlY29uZHMgPCAwIHx8IHNlY29uZHMgPiBzb25nVGltZSkgdGhyb3cgc2Vjb25kcyArIFwiIHNlY29uZHMgbm90IHdpdGhpbiBzb25nIHRpbWUgb2YgXCIgKyBzb25nVGltZTtcblx0XHR0aGlzLnNraXBUb1BlcmNlbnQoc2Vjb25kcyAvIHNvbmdUaW1lICogMTAwKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBDaGVja3MgaWYgcGxheWVyIGlzIHBsYXlpbmdcblx0ICogQHJldHVybiB7Ym9vbGVhbn1cblx0ICovXG5cdGlzUGxheWluZygpIHtcblx0XHRyZXR1cm4gdGhpcy5zZXRJbnRlcnZhbElkID4gMCB8fCB0eXBlb2YgdGhpcy5zZXRJbnRlcnZhbElkID09PSAnb2JqZWN0Jztcblx0fVxuXG5cdC8qKlxuXHQgKiBQbGF5cyB0aGUgbG9hZGVkIE1JREkgZmlsZSB3aXRob3V0IHJlZ2FyZCBmb3IgdGltaW5nIGFuZCBzYXZlcyBldmVudHMgaW4gdGhpcy5ldmVudHMuICBFc3NlbnRpYWxseSB1c2VkIGFzIGEgcGFyc2VyLlxuXHQgKiBAcmV0dXJuIHtQbGF5ZXJ9XG5cdCAqL1xuXHRkcnlSdW4oKSB7XG5cdFx0Ly8gUmVzZXQgdHJhY2tzIGZpcnN0XG5cdFx0dGhpcy5yZXNldFRyYWNrcygpO1xuXHRcdHdoaWxlICghdGhpcy5lbmRPZkZpbGUoKSkgdGhpcy5wbGF5TG9vcCh0cnVlKTtcblx0XHR0aGlzLmV2ZW50cyA9IHRoaXMuZ2V0RXZlbnRzKCk7XG5cdFx0dGhpcy50b3RhbEV2ZW50cyA9IHRoaXMuZ2V0VG90YWxFdmVudHMoKTtcblx0XHR0aGlzLnRvdGFsVGlja3MgPSB0aGlzLmdldFRvdGFsVGlja3MoKTtcblx0XHR0aGlzLnN0YXJ0VGljayA9IDA7XG5cdFx0dGhpcy5zdGFydFRpbWUgPSAwO1xuXG5cdFx0Ly8gTGVhdmUgdHJhY2tzIGluIHByaXN0aW5lIGNvbmRpc2hcblx0XHR0aGlzLnJlc2V0VHJhY2tzKCk7XG5cblx0XHQvL2NvbnNvbGUubG9nKCdTb25nIHRpbWU6ICcgKyB0aGlzLmdldFNvbmdUaW1lKCkgKyAnIHNlY29uZHMgLyAnICsgdGhpcy50b3RhbFRpY2tzICsgJyB0aWNrcy4nKTtcblxuXHRcdHRoaXMudHJpZ2dlclBsYXllckV2ZW50KCdmaWxlTG9hZGVkJywgdGhpcyk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvKipcblx0ICogUmVzZXRzIHBsYXkgcG9pbnRlcnMgZm9yIGFsbCB0cmFja3MuXG5cdCAqIEByZXR1cm4ge1BsYXllcn1cblx0ICovXG5cdHJlc2V0VHJhY2tzKCkge1xuXHRcdHRoaXMudHJhY2tzLmZvckVhY2godHJhY2sgPT4gdHJhY2sucmVzZXQoKSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvKipcblx0ICogR2V0cyBhbiBhcnJheSBvZiBldmVudHMgZ3JvdXBlZCBieSB0cmFjay5cblx0ICogQHJldHVybiB7YXJyYXl9XG5cdCAqL1xuXHRnZXRFdmVudHMoKSB7XG5cdFx0cmV0dXJuIHRoaXMudHJhY2tzLm1hcCh0cmFjayA9PiB0cmFjay5ldmVudHMpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldHMgdG90YWwgbnVtYmVyIG9mIHRpY2tzIGluIHRoZSBsb2FkZWQgTUlESSBmaWxlLlxuXHQgKiBAcmV0dXJuIHtudW1iZXJ9XG5cdCAqL1xuXHRnZXRUb3RhbFRpY2tzKCkge1xuXHRcdHJldHVybiBNYXRoLm1heC5hcHBseShudWxsLCB0aGlzLnRyYWNrcy5tYXAodHJhY2sgPT4gdHJhY2suZGVsdGEpKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZXRzIHRvdGFsIG51bWJlciBvZiBldmVudHMgaW4gdGhlIGxvYWRlZCBNSURJIGZpbGUuXG5cdCAqIEByZXR1cm4ge251bWJlcn1cblx0ICovXG5cdGdldFRvdGFsRXZlbnRzKCkge1xuXHRcdHJldHVybiB0aGlzLnRyYWNrcy5yZWR1Y2UoKGEsIGIpID0+IHtyZXR1cm4ge2V2ZW50czoge2xlbmd0aDogYS5ldmVudHMubGVuZ3RoICsgYi5ldmVudHMubGVuZ3RofX19LCB7ZXZlbnRzOiB7bGVuZ3RoOiAwfX0pLmV2ZW50cy5sZW5ndGg7XG5cdH1cblxuXHQvKipcblx0ICogR2V0cyBzb25nIGR1cmF0aW9uIGluIHNlY29uZHMuXG5cdCAqIEByZXR1cm4ge251bWJlcn1cblx0ICovXG5cdGdldFNvbmdUaW1lKCkge1xuXHRcdHJldHVybiB0aGlzLnRvdGFsVGlja3MgLyB0aGlzLmRpdmlzaW9uIC8gdGhpcy50ZW1wbyAqIDYwO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldHMgcmVtYWluaW5nIG51bWJlciBvZiBzZWNvbmRzIGluIHBsYXliYWNrLlxuXHQgKiBAcmV0dXJuIHtudW1iZXJ9XG5cdCAqL1xuXHRnZXRTb25nVGltZVJlbWFpbmluZygpIHtcblx0XHRyZXR1cm4gTWF0aC5yb3VuZCgodGhpcy50b3RhbFRpY2tzIC0gdGhpcy50aWNrKSAvIHRoaXMuZGl2aXNpb24gLyB0aGlzLnRlbXBvICogNjApO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldHMgcmVtYWluaW5nIHBlcmNlbnQgb2YgcGxheWJhY2suXG5cdCAqIEByZXR1cm4ge251bWJlcn1cblx0ICovXG5cdGdldFNvbmdQZXJjZW50UmVtYWluaW5nKCkge1xuXHRcdHJldHVybiBNYXRoLnJvdW5kKHRoaXMuZ2V0U29uZ1RpbWVSZW1haW5pbmcoKSAvIHRoaXMuZ2V0U29uZ1RpbWUoKSAqIDEwMCk7XG5cdH1cblxuXHQvKipcblx0ICogTnVtYmVyIG9mIGJ5dGVzIHByb2Nlc3NlZCBpbiB0aGUgbG9hZGVkIE1JREkgZmlsZS5cblx0ICogQHJldHVybiB7bnVtYmVyfVxuXHQgKi9cblx0Ynl0ZXNQcm9jZXNzZWQoKSB7XG5cdFx0Ly8gQ3VycmVudGx5IGFzc3VtZSBoZWFkZXIgY2h1bmsgaXMgc3RyaWN0bHkgMTQgYnl0ZXNcblx0XHRyZXR1cm4gMTQgKyB0aGlzLnRyYWNrcy5sZW5ndGggKiA4ICsgdGhpcy50cmFja3MucmVkdWNlKChhLCBiKSA9PiB7cmV0dXJuIHtwb2ludGVyOiBhLnBvaW50ZXIgKyBiLnBvaW50ZXJ9fSwge3BvaW50ZXI6IDB9KS5wb2ludGVyO1xuXHR9XG5cblx0LyoqXG5cdCAqIE51bWJlciBvZiBldmVudHMgcGxheWVkIHVwIHRvIHRoaXMgcG9pbnQuXG5cdCAqIEByZXR1cm4ge251bWJlcn1cblx0ICovXG5cdGV2ZW50c1BsYXllZCgpIHtcblx0XHRyZXR1cm4gdGhpcy50cmFja3MucmVkdWNlKChhLCBiKSA9PiB7cmV0dXJuIHtldmVudEluZGV4OiBhLmV2ZW50SW5kZXggKyBiLmV2ZW50SW5kZXh9fSwge2V2ZW50SW5kZXg6IDB9KS5ldmVudEluZGV4O1xuXHR9XG5cblx0LyoqXG5cdCAqIERldGVybWluZXMgaWYgdGhlIHBsYXllciBwb2ludGVyIGhhcyByZWFjaGVkIHRoZSBlbmQgb2YgdGhlIGxvYWRlZCBNSURJIGZpbGUuXG5cdCAqIFVzZWQgaW4gdHdvIHdheXM6XG5cdCAqIDEuIElmIHBsYXlpbmcgcmVzdWx0IGlzIGJhc2VkIG9uIGxvYWRlZCBKU09OIGV2ZW50cy5cblx0ICogMi4gSWYgcGFyc2luZyAoZHJ5UnVuKSBpdCdzIGJhc2VkIG9uIHRoZSBhY3R1YWwgYnVmZmVyIGxlbmd0aCB2cyBieXRlcyBwcm9jZXNzZWQuXG5cdCAqIEByZXR1cm4ge2Jvb2xlYW59XG5cdCAqL1xuXHRlbmRPZkZpbGUoKSB7XG5cdFx0aWYgKHRoaXMuaXNQbGF5aW5nKCkpIHtcblx0XHRcdHJldHVybiB0aGlzLmV2ZW50c1BsYXllZCgpID09IHRoaXMudG90YWxFdmVudHM7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuYnl0ZXNQcm9jZXNzZWQoKSA9PSB0aGlzLmJ1ZmZlci5sZW5ndGg7XG5cdH1cblxuXHQvKipcblx0ICogR2V0cyB0aGUgY3VycmVudCB0aWNrIG51bWJlciBpbiBwbGF5YmFjay5cblx0ICogQHJldHVybiB7bnVtYmVyfVxuXHQgKi9cblx0Z2V0Q3VycmVudFRpY2soKSB7XG5cdFx0cmV0dXJuIE1hdGgucm91bmQoKChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgLSB0aGlzLnN0YXJ0VGltZSkgLyAxMDAwICogKHRoaXMuZGl2aXNpb24gKiAodGhpcy50ZW1wbyAvIDYwKSkpICsgdGhpcy5zdGFydFRpY2s7XG5cdH1cblxuXHQvKipcblx0ICogU2VuZHMgTUlESSBldmVudCBvdXQgdG8gbGlzdGVuZXIuXG5cdCAqIEBwYXJhbSB7b2JqZWN0fVxuXHQgKiBAcmV0dXJuIHtQbGF5ZXJ9XG5cdCAqL1xuXHRlbWl0RXZlbnQoZXZlbnQpIHtcblx0XHR0aGlzLnRyaWdnZXJQbGF5ZXJFdmVudCgnbWlkaUV2ZW50JywgZXZlbnQpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIFN1YnNjcmliZXMgZXZlbnRzIHRvIGxpc3RlbmVycyBcblx0ICogQHBhcmFtIHtzdHJpbmd9IC0gTmFtZSBvZiBldmVudCB0byBzdWJzY3JpYmUgdG8uXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IC0gQ2FsbGJhY2sgdG8gZmlyZSB3aGVuIGV2ZW50IGlzIGJyb2FkY2FzdC5cblx0ICogQHJldHVybiB7UGxheWVyfVxuXHQgKi9cblx0b24ocGxheWVyRXZlbnQsIGZuKSB7XG5cdFx0aWYgKCF0aGlzLmV2ZW50TGlzdGVuZXJzLmhhc093blByb3BlcnR5KHBsYXllckV2ZW50KSkgdGhpcy5ldmVudExpc3RlbmVyc1twbGF5ZXJFdmVudF0gPSBbXTtcblx0XHR0aGlzLmV2ZW50TGlzdGVuZXJzW3BsYXllckV2ZW50XS5wdXNoKGZuKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBCcm9hZGNhc3RzIGV2ZW50IHRvIHRyaWdnZXIgc3Vic2NyaWJlZCBjYWxsYmFja3MuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSAtIE5hbWUgb2YgZXZlbnQuXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSAtIERhdGEgdG8gYmUgcGFzc2VkIHRvIHN1YnNjcmliZXIgY2FsbGJhY2suXG5cdCAqIEByZXR1cm4ge1BsYXllcn1cblx0ICovXG5cdHRyaWdnZXJQbGF5ZXJFdmVudChwbGF5ZXJFdmVudCwgZGF0YSkge1xuXHRcdGlmICh0aGlzLmV2ZW50TGlzdGVuZXJzLmhhc093blByb3BlcnR5KHBsYXllckV2ZW50KSkgdGhpcy5ldmVudExpc3RlbmVyc1twbGF5ZXJFdmVudF0uZm9yRWFjaChmbiA9PiBmbihkYXRhIHx8IHt9KSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxufVxuXG5leHBvcnRzLlBsYXllciA9IFBsYXllcjtcbi8qKlxuICogQ2xhc3MgcmVwcmVzZW50aW5nIGEgdHJhY2suICBDb250YWlucyBtZXRob2RzIGZvciBwYXJzaW5nIGV2ZW50cyBhbmQga2VlcGluZyB0cmFjayBvZiBwb2ludGVyLlxuICovXG5jbGFzcyBUcmFja1x0e1xuXHRjb25zdHJ1Y3RvcihpbmRleCwgZGF0YSkge1xuXHRcdHRoaXMuZW5hYmxlZCA9IHRydWU7XG5cdFx0dGhpcy5ldmVudEluZGV4ID0gMDtcblx0XHR0aGlzLnBvaW50ZXIgPSAwO1xuXHRcdHRoaXMubGFzdFRpY2sgPSAwO1xuXHRcdHRoaXMubGFzdFN0YXR1cyA9IG51bGw7XG5cdFx0dGhpcy5pbmRleCA9IGluZGV4O1xuXHRcdHRoaXMuZGF0YSA9IGRhdGE7XG5cdFx0dGhpcy5kZWx0YSA9IDA7XG5cdFx0dGhpcy5ydW5uaW5nRGVsdGEgPSAwO1xuXHRcdHRoaXMuZXZlbnRzID0gW107XG5cdH1cblxuXHQvKipcblx0ICogUmVzZXRzIGFsbCBzdGF0ZWZ1bCB0cmFjayBpbmZvcm1haW9uIHVzZWQgZHVyaW5nIHBsYXliYWNrLlxuXHQgKiBAcmV0dXJuIHtUcmFja31cblx0ICovXG5cdHJlc2V0KCkge1xuXHRcdHRoaXMuZW5hYmxlZCA9IHRydWU7XG5cdFx0dGhpcy5ldmVudEluZGV4ID0gMDtcblx0XHR0aGlzLnBvaW50ZXIgPSAwO1xuXHRcdHRoaXMubGFzdFRpY2sgPSAwO1xuXHRcdHRoaXMubGFzdFN0YXR1cyA9IG51bGw7XG5cdFx0dGhpcy5kZWx0YSA9IDA7XG5cdFx0dGhpcy5ydW5uaW5nRGVsdGEgPSAwO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIFNldHMgdGhpcyB0cmFjayB0byBiZSBlbmFibGVkIGR1cmluZyBwbGF5YmFjay5cblx0ICogQHJldHVybiB7VHJhY2t9XG5cdCAqL1xuXHRlbmFibGUoKSB7XG5cdFx0dGhpcy5lbmFibGVkID0gdHJ1ZTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBTZXRzIHRoaXMgdHJhY2sgdG8gYmUgZGlzYWJsZWQgZHVyaW5nIHBsYXliYWNrLlxuXHQgKiBAcmV0dXJuIHtUcmFja31cblx0ICovXG5cdGRpc2FibGUoKSB7XG5cdFx0dGhpcy5lbmFibGVkID0gZmFsc2U7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvKipcblx0ICogU2V0cyB0aGUgdHJhY2sgZXZlbnQgaW5kZXggdG8gdGhlIG5lYXJlc3QgZXZlbnQgdG8gdGhlIGdpdmVuIHRpY2suXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSB0aWNrXG5cdCAqIEByZXR1cm4ge1RyYWNrfVxuXHQgKi9cblx0c2V0RXZlbnRJbmRleEJ5VGljayh0aWNrKSB7XG5cdFx0dGljayA9IHRpY2sgfHwgMDtcblxuXHRcdGZvciAodmFyIGkgaW4gdGhpcy5ldmVudHMpIHtcblx0XHRcdGlmICh0aGlzLmV2ZW50c1tpXS50aWNrID49IHRpY2spIHtcblx0XHRcdFx0dGhpcy5ldmVudEluZGV4ID0gaTtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEdldHMgYnl0ZSBsb2NhdGVkIGF0IHBvaW50ZXIgcG9zaXRpb24uXG5cdCAqIEByZXR1cm4ge251bWJlcn1cblx0ICovXG5cdGdldEN1cnJlbnRCeXRlKCkge1xuXHRcdHJldHVybiB0aGlzLmRhdGFbdGhpcy5wb2ludGVyXTtcblx0fVxuXG5cdC8qKlxuXHQgKiBHZXRzIGNvdW50IG9mIGRlbHRhIGJ5dGVzIGFuZCBjdXJyZW50IHBvaW50ZXIgcG9zaXRpb24uXG5cdCAqIEByZXR1cm4ge251bWJlcn1cblx0ICovXG5cdGdldERlbHRhQnl0ZUNvdW50KCkge1xuXHRcdC8vIEdldCBieXRlIGNvdW50IG9mIGRlbHRhIFZMVlxuXHRcdC8vIGh0dHA6Ly93d3cuY2Nhcmgub3JnL2NvdXJzZXMvMjUzL2hhbmRvdXQvdmx2L1xuXHRcdC8vIElmIGJ5dGUgaXMgZ3JlYXRlciBvciBlcXVhbCB0byA4MGggKDEyOCBkZWNpbWFsKSB0aGVuIHRoZSBuZXh0IGJ5dGVcblx0ICAgIC8vIGlzIGFsc28gcGFydCBvZiB0aGUgVkxWLFxuXHQgICBcdC8vIGVsc2UgYnl0ZSBpcyB0aGUgbGFzdCBieXRlIGluIGEgVkxWLlxuXHQgICBcdHZhciBjdXJyZW50Qnl0ZSA9IHRoaXMuZ2V0Q3VycmVudEJ5dGUoKTtcblx0ICAgXHR2YXIgYnl0ZUNvdW50ID0gMTtcblxuXHRcdHdoaWxlIChjdXJyZW50Qnl0ZSA+PSAxMjgpIHtcblx0XHRcdGN1cnJlbnRCeXRlID0gdGhpcy5kYXRhW3RoaXMucG9pbnRlciArIGJ5dGVDb3VudF07XG5cdFx0XHRieXRlQ291bnQrKztcblx0XHR9XG5cblx0XHRyZXR1cm4gYnl0ZUNvdW50O1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBkZWx0YSB2YWx1ZSBhdCBjdXJyZW50IHBvaW50ZXIgcG9zaXRpb24uXG5cdCAqIEByZXR1cm4ge251bWJlcn1cblx0ICovXG5cdGdldERlbHRhKCkge1xuXHRcdHJldHVybiBVdGlscy5yZWFkVmFySW50KHRoaXMuZGF0YS5zbGljZSh0aGlzLnBvaW50ZXIsIHRoaXMucG9pbnRlciArIHRoaXMuZ2V0RGVsdGFCeXRlQ291bnQoKSkpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEhhbmRsZXMgZXZlbnQgd2l0aGluIGEgZ2l2ZW4gdHJhY2sgc3RhcnRpbmcgYXQgc3BlY2lmaWVkIGluZGV4XG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBjdXJyZW50VGlja1xuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IGRyeVJ1biAtIElmIHRydWUgZXZlbnRzIHdpbGwgYmUgcGFyc2VkIGFuZCByZXR1cm5lZCByZWdhcmRsZXNzIG9mIHRpbWUuXG5cdCAqL1xuXHRoYW5kbGVFdmVudChjdXJyZW50VGljaywgZHJ5UnVuKSB7XG5cdFx0ZHJ5UnVuID0gZHJ5UnVuIHx8IGZhbHNlO1xuXG5cdFx0aWYgKGRyeVJ1bikge1xuXHRcdFx0dmFyIGVsYXBzZWRUaWNrcyA9IGN1cnJlbnRUaWNrIC0gdGhpcy5sYXN0VGljaztcblx0XHRcdHZhciBkZWx0YSA9IHRoaXMuZ2V0RGVsdGEoKTtcblx0XHRcdHZhciBldmVudFJlYWR5ID0gZWxhcHNlZFRpY2tzID49IGRlbHRhO1xuXG5cdFx0XHRpZiAodGhpcy5wb2ludGVyIDwgdGhpcy5kYXRhLmxlbmd0aCAmJiAoZHJ5UnVuIHx8IGV2ZW50UmVhZHkpKSB7XG5cdFx0XHRcdGxldCBldmVudCA9IHRoaXMucGFyc2VFdmVudCgpO1xuXHRcdFx0XHRpZiAodGhpcy5lbmFibGVkKSByZXR1cm4gZXZlbnQ7XG5cdFx0XHRcdC8vIFJlY3Vyc2l2ZWx5IGNhbGwgdGhpcyBmdW5jdGlvbiBmb3IgZWFjaCBldmVudCBhaGVhZCB0aGF0IGhhcyAwIGRlbHRhIHRpbWU/XG5cdFx0XHR9XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gTGV0J3MgYWN0dWFsbHkgcGxheSB0aGUgTUlESSBmcm9tIHRoZSBnZW5lcmF0ZWQgSlNPTiBldmVudHMgY3JlYXRlZCBieSB0aGUgZHJ5IHJ1bi5cblx0XHRcdGlmICh0aGlzLmV2ZW50c1t0aGlzLmV2ZW50SW5kZXhdICYmIHRoaXMuZXZlbnRzW3RoaXMuZXZlbnRJbmRleF0udGljayA8PSBjdXJyZW50VGljaykge1xuXHRcdFx0XHR0aGlzLmV2ZW50SW5kZXgrKztcblx0XHRcdFx0aWYgKHRoaXMuZW5hYmxlZCkgcmV0dXJuIHRoaXMuZXZlbnRzW3RoaXMuZXZlbnRJbmRleCAtIDFdO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBzdHJpbmcgZGF0YSBmcm9tIGV2ZW50LlxuXHQgKiBAcGFyYW0ge251bWJlcn0gZXZlbnRTdGFydEluZGV4XG5cdCAqIEByZXR1cm4ge3N0cmluZ31cblx0ICovXG5cdGdldFN0cmluZ0RhdGEoZXZlbnRTdGFydEluZGV4KSB7XG5cdFx0dmFyIGN1cnJlbnRCeXRlID0gdGhpcy5wb2ludGVyO1xuXHRcdHZhciBieXRlQ291bnQgPSAxO1xuXHRcdHZhciBsZW5ndGggPSBVdGlscy5yZWFkVmFySW50KHRoaXMuZGF0YS5zbGljZShldmVudFN0YXJ0SW5kZXggKyAyLCBldmVudFN0YXJ0SW5kZXggKyAyICsgYnl0ZUNvdW50KSk7XG5cdFx0dmFyIHN0cmluZ0xlbmd0aCA9IGxlbmd0aDtcblxuXHRcdHJldHVybiBVdGlscy5ieXRlc1RvTGV0dGVycyh0aGlzLmRhdGEuc2xpY2UoZXZlbnRTdGFydEluZGV4ICsgYnl0ZUNvdW50ICsgMiwgZXZlbnRTdGFydEluZGV4ICsgYnl0ZUNvdW50ICsgbGVuZ3RoICsgMikpO1xuXHR9XG5cblx0LyoqXG5cdCAqIFBhcnNlcyBldmVudCBpbnRvIEpTT04gYW5kIGFkdmFuY2VzIHBvaW50ZXIgZm9yIHRoZSB0cmFja1xuXHQgKiBAcmV0dXJuIHtvYmplY3R9XG5cdCAqL1xuXHRwYXJzZUV2ZW50KCkge1xuXHRcdHZhciBldmVudFN0YXJ0SW5kZXggPSB0aGlzLnBvaW50ZXIgKyB0aGlzLmdldERlbHRhQnl0ZUNvdW50KCk7XG5cdFx0dmFyIGV2ZW50SnNvbiA9IHt9O1xuXHRcdHZhciBkZWx0YUJ5dGVDb3VudCA9IHRoaXMuZ2V0RGVsdGFCeXRlQ291bnQoKTtcblx0XHRldmVudEpzb24udHJhY2sgPSB0aGlzLmluZGV4ICsgMTtcblx0XHRldmVudEpzb24uZGVsdGEgPSB0aGlzLmdldERlbHRhKCk7XG5cdFx0dGhpcy5sYXN0VGljayA9IHRoaXMubGFzdFRpY2sgKyBldmVudEpzb24uZGVsdGE7XG5cdFx0dGhpcy5ydW5uaW5nRGVsdGEgKz0gZXZlbnRKc29uLmRlbHRhO1xuXHRcdGV2ZW50SnNvbi50aWNrID0gdGhpcy5ydW5uaW5nRGVsdGE7XG5cdFx0ZXZlbnRKc29uLmJ5dGVJbmRleCA9IHRoaXMucG9pbnRlcjtcblxuXHRcdC8vZXZlbnRKc29uLnJhdyA9IGV2ZW50O1xuXHRcdGlmICh0aGlzLmRhdGFbZXZlbnRTdGFydEluZGV4XSA9PSAweGZmKSB7XG5cdFx0XHQvLyBNZXRhIEV2ZW50XG5cblx0XHRcdC8vIElmIHRoaXMgaXMgYSBtZXRhIGV2ZW50IHdlIHNob3VsZCBlbWl0IHRoZSBkYXRhIGFuZCBpbW1lZGlhdGVseSBtb3ZlIHRvIHRoZSBuZXh0IGV2ZW50XG5cdFx0XHQvLyBvdGhlcndpc2UgaWYgd2UgbGV0IGl0IHJ1biB0aHJvdWdoIHRoZSBuZXh0IGN5Y2xlIGEgc2xpZ2h0IGRlbGF5IHdpbGwgYWNjdW11bGF0ZSBpZiBtdWx0aXBsZSB0cmFja3Ncblx0XHRcdC8vIGFyZSBiZWluZyBwbGF5ZWQgc2ltdWx0YW5lb3VzbHlcblxuXHRcdFx0c3dpdGNoKHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXggKyAxXSkge1xuXHRcdFx0XHRjYXNlIDB4MDA6IC8vIFNlcXVlbmNlIE51bWJlclxuXHRcdFx0XHRcdGV2ZW50SnNvbi5uYW1lID0gJ1NlcXVlbmNlIE51bWJlcic7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMHgwMTogLy8gVGV4dCBFdmVudFxuXHRcdFx0XHRcdGV2ZW50SnNvbi5uYW1lID0gJ1RleHQgRXZlbnQnO1xuXHRcdFx0XHRcdGV2ZW50SnNvbi5zdHJpbmcgPSB0aGlzLmdldFN0cmluZ0RhdGEoZXZlbnRTdGFydEluZGV4KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAweDAyOiAvLyBDb3B5cmlnaHQgTm90aWNlXG5cdFx0XHRcdFx0ZXZlbnRKc29uLm5hbWUgPSAnQ29weXJpZ2h0IE5vdGljZSc7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMHgwMzogLy8gU2VxdWVuY2UvVHJhY2sgTmFtZVxuXHRcdFx0XHRcdGV2ZW50SnNvbi5uYW1lID0gJ1NlcXVlbmNlL1RyYWNrIE5hbWUnO1xuXHRcdFx0XHRcdGV2ZW50SnNvbi5zdHJpbmcgPSB0aGlzLmdldFN0cmluZ0RhdGEoZXZlbnRTdGFydEluZGV4KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAweDA0OiAvLyBJbnN0cnVtZW50IE5hbWVcblx0XHRcdFx0XHRldmVudEpzb24ubmFtZSA9ICdJbnN0cnVtZW50IE5hbWUnO1xuXHRcdFx0XHRcdGV2ZW50SnNvbi5zdHJpbmcgPSB0aGlzLmdldFN0cmluZ0RhdGEoZXZlbnRTdGFydEluZGV4KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAweDA1OiAvLyBMeXJpY1xuXHRcdFx0XHRcdGV2ZW50SnNvbi5uYW1lID0gJ0x5cmljJztcblx0XHRcdFx0XHRldmVudEpzb24uc3RyaW5nID0gdGhpcy5nZXRTdHJpbmdEYXRhKGV2ZW50U3RhcnRJbmRleCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMHgwNjogLy8gTWFya2VyXG5cdFx0XHRcdFx0ZXZlbnRKc29uLm5hbWUgPSAnTWFya2VyJztcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAweDA3OiAvLyBDdWUgUG9pbnRcblx0XHRcdFx0XHRldmVudEpzb24ubmFtZSA9ICdDdWUgUG9pbnQnO1xuXHRcdFx0XHRcdGV2ZW50SnNvbi5zdHJpbmcgPSB0aGlzLmdldFN0cmluZ0RhdGEoZXZlbnRTdGFydEluZGV4KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAweDA5OiAvLyBEZXZpY2UgTmFtZVxuXHRcdFx0XHRcdGV2ZW50SnNvbi5uYW1lID0gJ0RldmljZSBOYW1lJztcblx0XHRcdFx0XHRldmVudEpzb24uc3RyaW5nID0gdGhpcy5nZXRTdHJpbmdEYXRhKGV2ZW50U3RhcnRJbmRleCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMHgyMDogLy8gTUlESSBDaGFubmVsIFByZWZpeFxuXHRcdFx0XHRcdGV2ZW50SnNvbi5uYW1lID0gJ01JREkgQ2hhbm5lbCBQcmVmaXgnO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIDB4MjE6IC8vIE1JREkgUG9ydFxuXHRcdFx0XHRcdGV2ZW50SnNvbi5uYW1lID0gJ01JREkgUG9ydCc7XG5cdFx0XHRcdFx0ZXZlbnRKc29uLmRhdGEgPSBVdGlscy5ieXRlc1RvTnVtYmVyKFt0aGlzLmRhdGFbZXZlbnRTdGFydEluZGV4ICsgM11dKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAweDJGOiAvLyBFbmQgb2YgVHJhY2tcblx0XHRcdFx0XHRldmVudEpzb24ubmFtZSA9ICdFbmQgb2YgVHJhY2snO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIDB4NTE6IC8vIFNldCBUZW1wb1xuXHRcdFx0XHRcdGV2ZW50SnNvbi5uYW1lID0gJ1NldCBUZW1wbyc7XG5cdFx0XHRcdFx0ZXZlbnRKc29uLmRhdGEgPSBNYXRoLnJvdW5kKDYwMDAwMDAwIC8gVXRpbHMuYnl0ZXNUb051bWJlcih0aGlzLmRhdGEuc2xpY2UoZXZlbnRTdGFydEluZGV4ICsgMywgZXZlbnRTdGFydEluZGV4ICsgNikpKTtcblx0XHRcdFx0XHR0aGlzLnRlbXBvID0gZXZlbnRKc29uLmRhdGE7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMHg1NDogLy8gU01UUEUgT2Zmc2V0XG5cdFx0XHRcdFx0ZXZlbnRKc29uLm5hbWUgPSAnU01UUEUgT2Zmc2V0Jztcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAweDU4OiAvLyBUaW1lIFNpZ25hdHVyZVxuXHRcdFx0XHRcdGV2ZW50SnNvbi5uYW1lID0gJ1RpbWUgU2lnbmF0dXJlJztcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAweDU5OiAvLyBLZXkgU2lnbmF0dXJlXG5cdFx0XHRcdFx0ZXZlbnRKc29uLm5hbWUgPSAnS2V5IFNpZ25hdHVyZSc7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgMHg3RjogLy8gU2VxdWVuY2VyLVNwZWNpZmljIE1ldGEtZXZlbnRcblx0XHRcdFx0XHRldmVudEpzb24ubmFtZSA9ICdTZXF1ZW5jZXItU3BlY2lmaWMgTWV0YS1ldmVudCc7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0ZXZlbnRKc29uLm5hbWUgPSAnVW5rbm93bjogJyArIHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXggKyAxXS50b1N0cmluZygxNik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBsZW5ndGggPSB0aGlzLmRhdGFbdGhpcy5wb2ludGVyICsgZGVsdGFCeXRlQ291bnQgKyAyXTtcblx0XHRcdC8vIFNvbWUgbWV0YSBldmVudHMgd2lsbCBoYXZlIHZsdiB0aGF0IG5lZWRzIHRvIGJlIGhhbmRsZWRcblxuXHRcdFx0dGhpcy5wb2ludGVyICs9IGRlbHRhQnl0ZUNvdW50ICsgMyArIGxlbmd0aDtcblxuXHRcdH0gZWxzZSBpZih0aGlzLmRhdGFbZXZlbnRTdGFydEluZGV4XSA9PSAweGYwKSB7XG5cdFx0XHQvLyBTeXNleFxuXHRcdFx0ZXZlbnRKc29uLm5hbWUgPSAnU3lzZXgnO1xuXHRcdFx0dmFyIGxlbmd0aCA9IHRoaXMuZGF0YVt0aGlzLnBvaW50ZXIgKyBkZWx0YUJ5dGVDb3VudCArIDFdO1xuXHRcdFx0dGhpcy5wb2ludGVyICs9IGRlbHRhQnl0ZUNvdW50ICsgMiArIGxlbmd0aDtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBWb2ljZSBldmVudFxuXHRcdFx0aWYgKHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXhdIDwgMHg4MCkge1xuXHRcdFx0XHQvLyBSdW5uaW5nIHN0YXR1c1xuXHRcdFx0XHRldmVudEpzb24ucnVubmluZyA9IHRydWU7XG5cdFx0XHRcdGV2ZW50SnNvbi5ub3RlTnVtYmVyID0gdGhpcy5kYXRhW2V2ZW50U3RhcnRJbmRleF07XG5cdFx0XHRcdGV2ZW50SnNvbi5ub3RlTmFtZSA9IENvbnN0YW50cy5OT1RFU1t0aGlzLmRhdGFbZXZlbnRTdGFydEluZGV4XV07XG5cdFx0XHRcdGV2ZW50SnNvbi52ZWxvY2l0eSA9IHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXggKyAxXTtcblxuXHRcdFx0XHRpZiAodGhpcy5sYXN0U3RhdHVzIDw9IDB4OGYpIHtcblx0XHRcdFx0XHRldmVudEpzb24ubmFtZSA9ICdOb3RlIG9mZic7XG5cdFx0XHRcdFx0ZXZlbnRKc29uLmNoYW5uZWwgPSB0aGlzLmxhc3RTdGF0dXMgLSAweDgwICsgMTtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMubGFzdFN0YXR1cyA8PSAweDlmKSB7XG5cdFx0XHRcdFx0ZXZlbnRKc29uLm5hbWUgPSAnTm90ZSBvbic7XG5cdFx0XHRcdFx0ZXZlbnRKc29uLmNoYW5uZWwgPSB0aGlzLmxhc3RTdGF0dXMgLSAweDkwICsgMTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMucG9pbnRlciArPSBkZWx0YUJ5dGVDb3VudCArIDI7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMubGFzdFN0YXR1cyA9IHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXhdO1xuXG5cdFx0XHRcdGlmICh0aGlzLmRhdGFbZXZlbnRTdGFydEluZGV4XSA8PSAweDhmKSB7XG5cdFx0XHRcdFx0Ly8gTm90ZSBvZmZcblx0XHRcdFx0XHRldmVudEpzb24ubmFtZSA9ICdOb3RlIG9mZic7XG5cdFx0XHRcdFx0ZXZlbnRKc29uLmNoYW5uZWwgPSB0aGlzLmxhc3RTdGF0dXMgLSAweDgwICsgMTtcblx0XHRcdFx0XHRldmVudEpzb24ubm90ZU51bWJlciA9IHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXggKyAxXTtcblx0XHRcdFx0XHRldmVudEpzb24ubm90ZU5hbWUgPSBDb25zdGFudHMuTk9URVNbdGhpcy5kYXRhW2V2ZW50U3RhcnRJbmRleCArIDFdXTtcblx0XHRcdFx0XHRldmVudEpzb24udmVsb2NpdHkgPSBNYXRoLnJvdW5kKHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXggKyAyXSAvIDEyNyAqIDEwMCk7XG5cdFx0XHRcdFx0dGhpcy5wb2ludGVyICs9IGRlbHRhQnl0ZUNvdW50ICsgMztcblxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXhdIDw9IDB4OWYpIHtcblx0XHRcdFx0XHQvLyBOb3RlIG9uXG5cdFx0XHRcdFx0ZXZlbnRKc29uLm5hbWUgPSAnTm90ZSBvbic7XG5cdFx0XHRcdFx0ZXZlbnRKc29uLmNoYW5uZWwgPSB0aGlzLmxhc3RTdGF0dXMgLSAweDkwICsgMTtcblx0XHRcdFx0XHRldmVudEpzb24ubm90ZU51bWJlciA9IHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXggKyAxXTtcblx0XHRcdFx0XHRldmVudEpzb24ubm90ZU5hbWUgPSBDb25zdGFudHMuTk9URVNbdGhpcy5kYXRhW2V2ZW50U3RhcnRJbmRleCArIDFdXTtcblx0XHRcdFx0XHRldmVudEpzb24udmVsb2NpdHkgPSBNYXRoLnJvdW5kKHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXggKyAyXSAvIDEyNyAqIDEwMCk7XG5cdFx0XHRcdFx0dGhpcy5wb2ludGVyICs9IGRlbHRhQnl0ZUNvdW50ICsgMztcblxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXhdIDw9IDB4YWYpIHtcblx0XHRcdFx0XHQvLyBQb2x5cGhvbmljIEtleSBQcmVzc3VyZVxuXHRcdFx0XHRcdGV2ZW50SnNvbi5uYW1lID0gJ1BvbHlwaG9uaWMgS2V5IFByZXNzdXJlJztcblx0XHRcdFx0XHRldmVudEpzb24uY2hhbm5lbCA9IHRoaXMubGFzdFN0YXR1cyAtIDB4YTAgKyAxO1xuXHRcdFx0XHRcdGV2ZW50SnNvbi5ub3RlID0gQ29uc3RhbnRzLk5PVEVTW3RoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXggKyAxXV07XG5cdFx0XHRcdFx0ZXZlbnRKc29uLnByZXNzdXJlID0gZXZlbnRbMl07XG5cdFx0XHRcdFx0dGhpcy5wb2ludGVyICs9IGRlbHRhQnl0ZUNvdW50ICsgMztcblxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXhdIDw9IDB4YmYpIHtcblx0XHRcdFx0XHQvLyBDb250cm9sbGVyIENoYW5nZVxuXHRcdFx0XHRcdGV2ZW50SnNvbi5uYW1lID0gJ0NvbnRyb2xsZXIgQ2hhbmdlJztcblx0XHRcdFx0XHRldmVudEpzb24uY2hhbm5lbCA9IHRoaXMubGFzdFN0YXR1cyAtIDB4YjAgKyAxO1xuXHRcdFx0XHRcdGV2ZW50SnNvbi5udW1iZXIgPSB0aGlzLmRhdGFbZXZlbnRTdGFydEluZGV4ICsgMV07XG5cdFx0XHRcdFx0ZXZlbnRKc29uLnZhbHVlID0gdGhpcy5kYXRhW2V2ZW50U3RhcnRJbmRleCArIDJdO1xuXHRcdFx0XHRcdHRoaXMucG9pbnRlciArPSBkZWx0YUJ5dGVDb3VudCArIDM7XG5cblx0XHRcdFx0fSBlbHNlIGlmICh0aGlzLmRhdGFbZXZlbnRTdGFydEluZGV4XSA8PSAweGNmKSB7XG5cdFx0XHRcdFx0Ly8gUHJvZ3JhbSBDaGFuZ2Vcblx0XHRcdFx0XHRldmVudEpzb24ubmFtZSA9ICdQcm9ncmFtIENoYW5nZSc7XG5cdFx0XHRcdFx0ZXZlbnRKc29uLmNoYW5uZWwgPSB0aGlzLmxhc3RTdGF0dXMgLSAweGMwICsgMTtcblx0XHRcdFx0XHR0aGlzLnBvaW50ZXIgKz0gZGVsdGFCeXRlQ291bnQgKyAyO1xuXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhpcy5kYXRhW2V2ZW50U3RhcnRJbmRleF0gPD0gMHhkZikge1xuXHRcdFx0XHRcdC8vIENoYW5uZWwgS2V5IFByZXNzdXJlXG5cdFx0XHRcdFx0ZXZlbnRKc29uLm5hbWUgPSAnQ2hhbm5lbCBLZXkgUHJlc3N1cmUnO1xuXHRcdFx0XHRcdGV2ZW50SnNvbi5jaGFubmVsID0gdGhpcy5sYXN0U3RhdHVzIC0gMHhkMCArIDE7XG5cdFx0XHRcdFx0dGhpcy5wb2ludGVyICs9IGRlbHRhQnl0ZUNvdW50ICsgMjtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMuZGF0YVtldmVudFN0YXJ0SW5kZXhdIDw9IDB4ZWYpIHtcblx0XHRcdFx0XHQvLyBQaXRjaCBCZW5kXG5cdFx0XHRcdFx0ZXZlbnRKc29uLm5hbWUgPSAnUGl0Y2ggQmVuZCc7XG5cdFx0XHRcdFx0ZXZlbnRKc29uLmNoYW5uZWwgPSB0aGlzLmxhc3RTdGF0dXMgLSAweGUwICsgMTtcblx0XHRcdFx0XHR0aGlzLnBvaW50ZXIgKz0gZGVsdGFCeXRlQ291bnQgKyAzO1xuXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZXZlbnRKc29uLm5hbWUgPSAnVW5rbm93bi4gIFBvaW50ZXI6ICcgKyB0aGlzLnBvaW50ZXIudG9TdHJpbmcoKSArICcgJyAgKyBldmVudFN0YXJ0SW5kZXgudG9TdHJpbmcoKSArICcgJyArIHRoaXMuZGF0YS5sZW5ndGg7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLmRlbHRhICs9IGV2ZW50SnNvbi5kZWx0YTtcblx0XHR0aGlzLmV2ZW50cy5wdXNoKGV2ZW50SnNvbik7XG5cblx0XHRyZXR1cm4gZXZlbnRKc29uO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJldHVybnMgdHJ1ZSBpZiBwb2ludGVyIGhhcyByZWFjaGVkIHRoZSBlbmQgb2YgdGhlIHRyYWNrLlxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59XG5cdCAqL1xuXHRlbmRPZlRyYWNrKCkge1xuXHRcdGlmICh0aGlzLmRhdGFbdGhpcy5wb2ludGVyICsgMV0gPT0gMHhmZiAmJiB0aGlzLmRhdGFbdGhpcy5wb2ludGVyICsgMl0gPT0gMHgyZiAmJiB0aGlzLmRhdGFbdGhpcy5wb2ludGVyICsgM10gPT0gMHgwMCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG4vKipcbiAqIENvbnRhaW5zIG1pc2Mgc3RhdGljIHV0aWxpdHkgbWV0aG9kcy5cbiAqL1xuY2xhc3MgVXRpbHMge1xuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIHNpbmdsZSBieXRlIHRvIGEgaGV4IHN0cmluZy5cblx0ICogQHBhcmFtIHtudW1iZXJ9IGJ5dGVcblx0ICogQHJldHVybiB7c3RyaW5nfVxuXHQgKi9cblx0c3RhdGljIGJ5dGVUb0hleChieXRlKSB7XG5cdFx0Ly8gRW5zdXJlIGhleCBzdHJpbmcgYWx3YXlzIGhhcyB0d28gY2hhcnNcblx0XHRyZXR1cm4gKCcwJyArIGJ5dGUudG9TdHJpbmcoMTYpKS5zbGljZSgtMik7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYW4gYXJyYXkgb2YgYnl0ZXMgdG8gYSBoZXggc3RyaW5nLlxuXHQgKiBAcGFyYW0ge2FycmF5fSBieXRlQXJyYXlcblx0ICogQHJldHVybiB7c3RyaW5nfVxuXHQgKi9cblx0c3RhdGljIGJ5dGVzVG9IZXgoYnl0ZUFycmF5KSB7XG5cdFx0dmFyIGhleCA9IFtdO1xuXHRcdGJ5dGVBcnJheS5mb3JFYWNoKGJ5dGUgPT4gaGV4LnB1c2goVXRpbHMuYnl0ZVRvSGV4KGJ5dGUpKSk7XG5cdFx0cmV0dXJuIGhleC5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGhleCBzdHJpbmcgdG8gYSBudW1iZXIuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBoZXhTdHJpbmdcblx0ICogQHJldHVybiB7bnVtYmVyfVxuXHQgKi9cblx0c3RhdGljIGhleFRvTnVtYmVyKGhleFN0cmluZykge1xuXHRcdHJldHVybiBwYXJzZUludChoZXhTdHJpbmcsIDE2KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhbiBhcnJheSBvZiBieXRlcyB0byBhIG51bWJlci5cblx0ICogQHBhcmFtIHthcnJheX0gYnl0ZUFycmF5XG5cdCAqIEByZXR1cm4ge251bWJlcn1cblx0ICovXG5cdHN0YXRpYyBieXRlc1RvTnVtYmVyKGJ5dGVBcnJheSkge1xuXHRcdHJldHVybiBVdGlscy5oZXhUb051bWJlcihVdGlscy5ieXRlc1RvSGV4KGJ5dGVBcnJheSkpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGFuIGFycmF5IG9mIGJ5dGVzIHRvIGxldHRlcnMuXG5cdCAqIEBwYXJhbSB7YXJyYXl9IGJ5dGVBcnJheVxuXHQgKiBAcmV0dXJuIHtzdHJpbmd9XG5cdCAqL1xuXHRzdGF0aWMgYnl0ZXNUb0xldHRlcnMoYnl0ZUFycmF5KSB7XG5cdFx0dmFyIGxldHRlcnMgPSBbXTtcblx0XHRieXRlQXJyYXkuZm9yRWFjaChieXRlID0+IGxldHRlcnMucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGUpKSk7XG5cdFx0cmV0dXJuIGxldHRlcnMuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBkZWNpbWFsIHRvIGl0J3MgYmluYXJ5IHJlcHJlc2VudGF0aW9uLlxuXHQgKiBAcGFyYW0ge251bWJlcn0gZGVjXG5cdCAqIEByZXR1cm4ge3N0cmluZ31cblx0ICovXG5cdHN0YXRpYyBkZWNUb0JpbmFyeShkZWMpIHtcbiAgICBcdHJldHVybiAoZGVjID4+PiAwKS50b1N0cmluZygyKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZWFkcyBhIHZhcmlhYmxlIGxlbmd0aCB2YWx1ZS5cblx0ICogQHBhcmFtIHthcnJheX0gYnl0ZUFycmF5XG5cdCAqIEByZXR1cm4ge251bWJlcn1cblx0ICovXG5cdHN0YXRpYyByZWFkVmFySW50KGJ5dGVBcnJheSkge1xuXHRcdHZhciByZXN1bHQgPSAwO1xuXHRcdGJ5dGVBcnJheS5mb3JFYWNoKG51bWJlciA9PiB7XG5cdFx0XHR2YXIgYiA9IG51bWJlcjtcblx0XHRcdGlmIChiICYgMHg4MCkge1xuXHRcdFx0XHRyZXN1bHQgKz0gKGIgJiAweDdmKTtcblx0XHRcdFx0cmVzdWx0IDw8PSA3O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0LyogYiBpcyB0aGUgbGFzdCBieXRlICovXG5cdFx0XHRcdHJlc3VsdCArPSBiO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdC8qKlxuXHQgKiBEZWNvZGVzIGJhc2UtNjQgZW5jb2RlZCBzdHJpbmcgXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmdcblx0ICogQHJldHVybiB7c3RyaW5nfVxuXHQgKi9cblx0c3RhdGljIGF0b2Ioc3RyaW5nKSB7XG5cdFx0aWYgKHR5cGVvZiBhdG9iID09PSAnZnVuY3Rpb24nKSByZXR1cm4gYXRvYihzdHJpbmcpO1xuXHRcdHJldHVybiBuZXcgQnVmZmVyKHN0cmluZywgJ2Jhc2U2NCcpLnRvU3RyaW5nKCdiaW5hcnknKTtcblx0fVxufVxuXG5leHBvcnRzLlV0aWxzID0gVXRpbHM7Il19
