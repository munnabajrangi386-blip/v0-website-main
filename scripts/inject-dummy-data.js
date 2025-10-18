// Quick script to inject dummy data for testing
const fs = require('fs');
const path = require('path');

// Create dummy content data
const dummyContent = {
  banners: [
    {
      id: "banner-1",
      text: "Direct disawar company — honesty first. Whatsapp for secure play.",
      kind: "warning"
    },
    {
      id: "banner-2", 
      text: "Welcome to Satta King. Play responsibly. Avoid fraud. ✅✅✅",
      kind: "info"
    }
  ],
  ads: [
    {
      id: "ad-1",
      title: "Sample Casino Ad",
      imageUrl: "/sample-casino-banner.jpg",
      href: "#",
      active: true,
      createdAt: new Date().toISOString()
    }
  ],
  categories: [
    { key: "ghaziabad1", label: "GHAZIABAD1", showInToday: true },
    { key: "gali1", label: "GALI1", showInToday: true },
    { key: "faridabad1", label: "FARIDABAD1", showInToday: true },
    { key: "desawar1", label: "DESAWAR1", showInToday: true }
  ],
  headerHighlight: { enabled: false },
  headerImage: {
    id: "header-1",
    imageUrl: "/images/reference-aura.png",
    alt: "Header Image",
    active: true
  },
  footerNote: {
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    active: true
  },
  updatedAt: new Date().toISOString()
};

// Create dummy monthly results
const dummyMonthlyResults = {
  month: "2025-10",
  fields: ["ghaziabad1", "gali1", "faridabad1", "desawar1", "disawar", "gali", "ghaziabad", "faridabad"],
  rows: [
    { date: "2025-10-01", ghaziabad1: "99", gali1: "88", faridabad1: "77", desawar1: "66", disawar: "55", gali: "44", ghaziabad: "33", faridabad: "22" },
    { date: "2025-10-02", ghaziabad1: "11", gali1: "22", faridabad1: "33", desawar1: "44", disawar: "55", gali: "66", ghaziabad: "77", faridabad: "88" },
    { date: "2025-10-03", ghaziabad1: "12", gali1: "23", faridabad1: "34", desawar1: "45", disawar: "56", gali: "67", ghaziabad: "78", faridabad: "89" },
    { date: "2025-10-04", ghaziabad1: "13", gali1: "24", faridabad1: "35", desawar1: "46", disawar: "57", gali: "68", ghaziabad: "79", faridabad: "90" },
    { date: "2025-10-05", ghaziabad1: "14", gali1: "25", faridabad1: "36", desawar1: "47", disawar: "58", gali: "69", ghaziabad: "80", faridabad: "91" }
  ],
  updatedAt: new Date().toISOString()
};

// Create dummy schedules
const dummySchedules = [
  {
    id: "schedule-1",
    publishAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    month: "2025-10",
    row: {
      date: "2025-10-17",
      ghaziabad1: "99",
      gali1: "88"
    },
    merge: false,
    executed: false
  },
  {
    id: "schedule-2", 
    publishAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
    month: "2025-10",
    row: {
      date: "2025-10-18",
      faridabad1: "77",
      desawar1: "66"
    },
    merge: false,
    executed: false
  }
];

console.log("✅ Dummy data created successfully!");
console.log("📊 Content:", JSON.stringify(dummyContent, null, 2));
console.log("📅 Monthly Results:", JSON.stringify(dummyMonthlyResults, null, 2));
console.log("⏰ Schedules:", JSON.stringify(dummySchedules, null, 2));
