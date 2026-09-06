// Orders state manager with realistic initial mock data and localStorage persistence

const ORDERS_KEY = 'eko_orders_v1';

const INITIAL_ORDERS = [
  {
    id: 'EKO-9421',
    title: 'Broken Jar — Deluxe Master & Vocal Polish',
    service: 'Mixing & Mastering',
    date: '2026-09-02',
    status: 'Delivered',
    currentStage: 5,
    client: 'Alex Rivera',
    email: 'alex@riverasound.com',
    amount: 149,
    downloadUrl: './assets/audio/broken jar mastered.mp3',
    downloadName: 'Broken_Jar_Mastered_24bit.mp3',
    notes: 'Checked loudness at -14 LUFS integrated. Cleaned low-mid resonances and widened side image.',
    timeline: [
      { title: 'Order Placed & Payment Verified', time: 'Sep 2, 10:15 AM', done: true },
      { title: 'Stems Ingested & Audio Pre-flight Check', time: 'Sep 2, 11:30 AM', done: true },
      { title: 'Analog-Modeled Mix & Master Processing', time: 'Sep 3, 02:45 PM', done: true },
      { title: 'Revisions & Critical Listening QA', time: 'Sep 3, 07:10 PM', done: true },
      { title: 'Final 24-bit 48kHz Master Delivered', time: 'Sep 4, 09:00 AM', done: true }
    ]
  },
  {
    id: 'EKO-8814',
    title: 'Kensuke — Anime Teaser Soundtrack Lease',
    service: 'Beat Lease (Premium WAV)',
    date: '2026-09-04',
    status: 'Delivered',
    currentStage: 5,
    client: 'Studio Kroma',
    email: 'kroma@animeworks.jp',
    amount: 99,
    downloadUrl: './assets/audio/Kensuke.mp3',
    downloadName: 'Kensuke_Instrumental_WAV.mp3',
    notes: 'Premium WAV license valid for streaming up to 250,000 plays and sync usage for video teaser.',
    timeline: [
      { title: 'License Purchased & Instant Key Generated', time: 'Sep 4, 04:20 PM', done: true },
      { title: 'License PDF Agreement Generated', time: 'Sep 4, 04:21 PM', done: true },
      { title: 'Master WAV & MP3 Delivery Link Sent', time: 'Sep 4, 04:22 PM', done: true }
    ]
  },
  {
    id: 'EKO-7930',
    title: 'Neon Horizon — Full Multitrack Mix & Vocal Tuning',
    service: 'Vocal Mixing & Tuning',
    date: '2026-09-05',
    status: 'In Production',
    currentStage: 3,
    client: 'Maya Lin',
    email: 'maya@singersong.co',
    amount: 99,
    notes: 'Melodyne vocal tuning in progress. De-essing applied to lead vocals. First test bounce ready in ~12 hrs.',
    timeline: [
      { title: 'Audio Uploaded via Portal', time: 'Sep 5, 08:30 AM', done: true },
      { title: 'Stems Verified & Key/BPM Mapped (128 BPM, F#m)', time: 'Sep 5, 09:15 AM', done: true },
      { title: 'Lead Vocal Manual Tuning & De-harshing', time: 'In progress', done: false, active: true },
      { title: 'Client Mix Review Bounce', time: 'Est. Sep 6, 11:00 AM', done: false },
      { title: 'Final Master Delivery', time: 'Est. Sep 6, 05:00 PM', done: false }
    ]
  }
];

function getStoredOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_ORDERS;
  }
}

let orders = getStoredOrders();

export const ordersStore = {
  getOrders() {
    return [...orders];
  },
  findOrder(query) {
    if (!query) return null;
    const clean = query.trim().toLowerCase();
    return orders.find(o => 
      o.id.toLowerCase() === clean || 
      o.email.toLowerCase() === clean ||
      o.client.toLowerCase().includes(clean) ||
      o.title.toLowerCase().includes(clean)
    );
  },
  addOrder(orderData) {
    const newOrder = {
      id: 'EKO-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().split('T')[0],
      status: 'In Production',
      currentStage: 2,
      timeline: [
        { title: 'Order Submitted & Payment Verified', time: 'Just now', done: true },
        { title: 'Files Ingested & Audio Pre-flight Check', time: 'In progress', done: false, active: true },
        { title: 'Production / Mixing & Processing', time: 'Pending', done: false },
        { title: 'Revisions & Quality Check', time: 'Pending', done: false },
        { title: 'Final Delivery', time: 'Est. 24–48 hrs', done: false }
      ],
      ...orderData
    };
    orders.unshift(newOrder);
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error(e);
    }
    return newOrder;
  }
};
