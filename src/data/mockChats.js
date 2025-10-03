const mockChats = [
  {
    id: "intro-to-quantum-physics",
    title: "Intro to Quantum Physics",
    messages: [
      { id: 1, role: "ai", text: "Quantum physics studies matter and energy at very small scales." },
      { id: 2, role: "user", text: "Give me a simple analogy." },
      { id: 3, role: "ai", text: "Think of particles as waves that behave differently when observed." }
    ]
  },
  {
    id: "photosynthesis-basics",
    title: "Photosynthesis Basics",
    messages: [
      { id: 1, role: "ai", text: "Photosynthesis converts light energy into chemical energy." }
    ]
  },
  {
    id: "algebra-intro",
    title: "Intro to Algebra",
    messages: [
      { id: 1, role: "ai", text: "Algebra uses symbols to represent numbers and relationships." }
    ]
  }
];

export default mockChats;
