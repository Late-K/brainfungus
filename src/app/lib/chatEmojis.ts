// emoji shown in the chat's emoji picker, grouped into tabs

export type EmojiCategory = { id: string; label: string; icon: string; emojis: string[] };

function split(list: string) {
  return list.split(" ").filter(Boolean);
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "😀",
    emojis: split(
      "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👻 👽 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾",
    ),
  },
  {
    id: "people",
    label: "Gestures",
    icon: "👍",
    emojis: split(
      "👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 👀 👁️ 👅 👄 🧠 🫶 🙋 🙆 🙅 🤷 🤦 🙇 💃 🕺 👯 🧑‍🎤 👨‍🎤 👩‍🎤 🧑‍🤝‍🧑",
    ),
  },
  {
    id: "music",
    label: "Music",
    icon: "🎸",
    emojis: split(
      "🎸 🎹 🥁 🎷 🎺 🎻 🪕 🪘 🪗 🎤 🎧 🎼 🎵 🎶 📻 🔊 🔉 🔈 🔇 📢 📣 🎙️ 🎚️ 🎛️ 💿 📀 🎬 🎟️ 🎫 🎪 🎭 🎨 🤘 🪩 🎉 🎊 🥳 🏟️ 🚐 🎒",
    ),
  },
  {
    id: "hearts",
    label: "Hearts",
    icon: "❤️",
    emojis: split(
      "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💯 💢 💥 💫 💦 💨 🔥 ✨ ⭐ 🌟 ⚡ 💤 💬 💭 🗯️ ✅ ❌ ❓ ❗ ‼️ ⁉️ ⚠️ 🚫 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪",
    ),
  },
  {
    id: "food",
    label: "Food",
    icon: "🍕",
    emojis: split(
      "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🌶️ 🌽 🥕 🥐 🍞 🧀 🥚 🍳 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🍝 🍜 🍣 🍱 🍩 🍪 🎂 🍰 🧁 🍫 🍿 ☕ 🍵 🧃 🥤 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉",
    ),
  },
  {
    id: "activities",
    label: "Activities",
    icon: "⚽",
    emojis: split(
      "⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🛹 🏂 🏋️ 🚴 🏆 🥇 🥈 🥉 🏅 🎯 🎳 🎮 🕹️ 🎲 🧩 ♟️ 🎰 🚗 🚌 🚐 🚀 ✈️ 🏠 🏢 🏟️ 🌍 🗺️ 📅 ⏰ ⌛ 📸 📷 📹 🎥 📱 💻 🖥️ 🎁 🎈 💡 📝 📌 📎 🔗 🔒 🔑 💰 💸",
    ),
  },
  {
    id: "nature",
    label: "Nature",
    icon: "🍄",
    emojis: split(
      "🍄 🌱 🌿 🍀 🌵 🌴 🌲 🌳 🍁 🍂 🌸 🌼 🌻 🌹 🌷 🌺 🌈 ☀️ 🌤️ ⛅ 🌧️ ⛈️ 🌩️ ❄️ ☃️ 🌊 🌙 🌚 🌝 🌞 🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🦇 🐺 🐴 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🐙 🦀 🐠 🐬 🐳 🦈",
    ),
  },
];
