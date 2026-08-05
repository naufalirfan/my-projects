var questions = [
  {
    id: 1,
    category: "Coding",
    question: "Apa time complexity dari binary search?",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correct: 1,
    explanation: "Binary search membagi array menjadi 2 bagian setiap iterasi. Jadi waktu yang dibutuhkan sebanding dengan log n, bukan n.",
    difficulty: "Mudah"
  },
  {
    id: 2,
    category: "Coding",
    question: "Struktur data apa yang paling cocok untuk implementasi LRU Cache?",
    options: ["Array", "Stack", "HashMap + Doubly Linked List", "Tree"],
    correct: 2,
    explanation: "HashMap memberikan akses O(1) untuk lookup, Doubly Linked List memungkinkan insert/delete dari tengah dalam O(1). Kombinasi keduanya cocok untuk LRU Cache.",
    difficulty: "Menengah"
  },
  {
    id: 3,
    category: "Coding",
    question: "Apa perbedaan Array dan Linked List?",
    options: [
      "Array lebih cepat untuk insert di tengah",
      "Linked List butuh sequential access, Array bisa random access",
      "Linked List butuh more memory per element",
      "Array tidak bisa dynamic sizing"
    ],
    correct: 1,
    explanation: "Array menyimpan elemen secara kontinu di memory, sehingga bisa akses langsung (random access) dengan index. Linked List harus traverse dari awal.",
    difficulty: "Mudah"
  },
  {
    id: 4,
    category: "Coding",
    question: "Apa output dari: `console.log(typeof null)` di JavaScript?",
    options: ["null", "undefined", "object", "boolean"],
    correct: 2,
    explanation: "Ini adalah bug legendaris di JavaScript. `typeof null` mengembalikan 'object' karena alasan historis dari implementasi awal JavaScript.",
    difficulty: "Menengah"
  },
  {
    id: 5,
    category: "Coding",
    question: "Algoritma sorting mana yang punya worst case O(n log n)?",
    options: ["Bubble Sort", "Quick Sort", "Merge Sort", "Insertion Sort"],
    correct: 2,
    explanation: "Merge Sort selalu O(n log n) di semua kasus. Quick Sort bisa O(n^2) di worst case (saat array sudah terurut), meskipun rata-ratanya O(n log n).",
    difficulty: "Menengah"
  },
  {
    id: 6,
    category: "Coding",
    question: "Apa itu recursion dan kapan harus menggunakannya?",
    options: [
      "Fungsi yang memanggil dirinya sendiri, cocok untuk masalah divide & conquer",
      "Perulangan pakai for loop",
      "Cara menyimpan data secara sementara",
      "Teknik optimasi performa"
    ],
    correct: 0,
    explanation: "Recursion adalah teknik di mana fungsi memanggil dirinya sendiri dengan input yang lebih kecil. Cocok untuk masalah seperti tree traversal, divide & conquer, dan fractal.",
    difficulty: "Mudah"
  },
  {
    id: 7,
    category: "Coding",
    question: "Apa itu Big O Notation?",
    options: [
      "Cara menulis kode yang rapi",
      "Notasi untuk mengukur efisiensi algoritma",
      "Bahasa pemrograman baru",
      "Framework untuk testing"
    ],
    correct: 1,
    explanation: "Big O Notation digunakan untuk menggambarkan performa algoritma dalam hal waktu dan ruang. Contoh: O(1), O(log n), O(n), O(n^2).",
    difficulty: "Mudah"
  },
  {
    id: 8,
    category: "Coding",
    question: "Stack menggunakan prinsip apa?",
    options: ["FIFO (First In First Out)", "LIFO (Last In First Out)", "Random Access", "Priority Queue"],
    correct: 1,
    explanation: "Stack menggunakan prinsip LIFO: elemen terakhir yang masuk adalah yang pertama keluar. Bayangkan seperti tumpukan piring.",
    difficulty: "Mudah"
  },
  {
    id: 9,
    category: "Coding",
    question: "Apa kegunaan dari HashMap/Dictionary?",
    options: [
      "Menyimpan data secara terurut",
      "Lookup data dalam waktu O(1)",
      "Mengurutkan data",
      "Menyimpan data secara hierarkis"
    ],
    correct: 1,
    explanation: "HashMap memberikan waktu akses rata-rata O(1) untuk insert dan lookup menggunakan hashing. Sangat efektif untuk pencarian berdasarkan key.",
    difficulty: "Mudah"
  },
  {
    id: 10,
    category: "Coding",
    question: "Apa bedanya DFS dan BFS?",
    options: [
      "DFS pakai queue, BFS pakai stack",
      "DFS menjelajahi sedalam mungkin dulu, BFS level per level",
      "DFS lebih cepat dari BFS",
      "DFS untuk graph, BFS untuk tree"
    ],
    correct: 1,
    explanation: "DFS (Depth First Search) menjelajahi satu jalur sampai mentok baru backtracking. BFS (Breadth First Search) menjelajahi semua neighbor di level yang sama dulu.",
    difficulty: "Menengah"
  },
  {
    id: 11,
    category: "Coding",
    question: "Apa itu closure dalam JavaScript?",
    options: [
      "Fungsi yang tidak bisa diakses dari luar",
      "Fungsi yang mengingat variabel dari scope parent-nya",
      "Cara menutup browser window",
      "Variabel global yang tersembunyi"
    ],
    correct: 1,
    explanation: "Closure adalah fungsi yang 'mengingat' variabel dari scope luar bahkan setelah fungsi tersebut selesai dijalankan. Ini sangat berguna untuk data privacy dan factory function.",
    difficulty: "Menengah"
  },
  {
    id: 12,
    category: "Coding",
    question: "Apa kelemahan utama dari Hash Table?",
    options: [
      "Tidak bisa menyimpan data",
      "Collision: dua key menghasilkan hash yang sama",
      "Terlalu lambat untuk lookup",
      "Tidak bisa di-scale"
    ],
    correct: 1,
    explanation: "Hash Table bisa mengalami collision saat dua key berbeda menghasilkan hash value yang sama. Diatasi dengan chaining atau open addressing.",
    difficulty: "Menengah"
  },
  {
    id: 13,
    category: "System Design",
    question: "Apa itu CDN dan mengapa penting untuk website skala besar?",
    options: [
      "Content Delivery Network: menyimpan konten di server yang dekat dengan user",
      "Cara untuk mengenkripsi data",
      "Sistem database terdistribusi",
      "Tool untuk monitoring server"
    ],
    correct: 0,
    explanation: "CDN mendistribusikan konten (gambar, video, CSS, JS) ke server yang tersebar di berbagai lokasi. User mengakses dari server terdekat, sehingga lebih cepat.",
    difficulty: "Mudah"
  },
  {
    id: 14,
    category: "System Design",
    question: "Apa perbedaan SQL dan NoSQL?",
    options: [
      "SQL untuk NoSQL untuk web",
      "SQL: structured data + relasi, NoSQL: flexible schema + horizontal scaling",
      "SQL lebih cepat dari NoSQL",
      "NoSQL tidak bisa menyimpan data besar"
    ],
    correct: 1,
    explanation: "SQL (PostgreSQL, MySQL) menggunakan tabel dengan schema tetap dan relasi. NoSQL (MongoDB, Redis) lebih fleksibel, schema-less, dan mudah di-scale horizontal.",
    difficulty: "Menengah"
  },
  {
    id: 15,
    category: "System Design",
    question: "Apa itu load balancer dan fungsinya?",
    options: [
      "Menghapus server yang down",
      "Mendistribusikan traffic ke beberapa server",
      "Menyimpan cache website",
      "Mengelola database"
    ],
    correct: 1,
    explanation: "Load balancer membagi traffic yang masuk ke beberapa server agar tidak ada server yang kelebihan beban. Contoh: Nginx, AWS ELB, Cloudflare.",
    difficulty: "Mudah"
  },
  {
    id: 16,
    category: "System Design",
    question: "Bagaimana cara mendesain sistem chat seperti WhatsApp?",
    options: [
      "Pakai HTTP polling setiap detik",
      "WebSocket untuk real-time + message queue untuk reliability",
      "Cukup pakai email",
      "Simpan semua di satu database"
    ],
    correct: 1,
    explanation: "Chat real-time butuh WebSocket untuk komunikasi dua arah. Message queue (Kafka/RabbitMQ) memastikan pesan tidak hilang. Database untuk persist history.",
    difficulty: "Menengah"
  },
  {
    id: 17,
    category: "System Design",
    question: "Apa itu microservices?",
    options: [
      "Aplikasi yang sangat kecil",
      "Arsitektur di mana aplikasi dipecah menjadi layanan-layanan kecil yang independen",
      "Cara menulis kode yang lebih sedikit",
      "Framework frontend"
    ],
    correct: 1,
    explanation: "Microservices memecah monolith menjadi layanan kecil (auth, payment, notification) yang bisa di-deploy dan di-scale secara independen.",
    difficulty: "Menengah"
  },
  {
    id: 18,
    category: "System Design",
    question: "Apa itu caching dan kapan harus menggunakannya?",
    options: [
      "Menyimpan data di database",
      "Menyimpan hasil yang sering diakses di memori untuk akses lebih cepat",
      "Menghapus data yang tidak terpakai",
      "Cara kompresi file"
    ],
    correct: 1,
    explanation: "Caching menyimpan data yang sering diakses di tempat cepat (Redis, Memcached, browser cache). Mengurangi query ke database dan mempercepat response.",
    difficulty: "Mudah"
  },
  {
    id: 19,
    category: "System Design",
    question: "Bagaimana cara menangani 1 juta user secara bersamaan?",
    options: [
      "Pakai 1 server dengan RAM besar",
      "Horizontal scaling: tambah server + load balancer + caching + database partitioning",
      "Non internet semua",
      "Pakai 1 database saja"
    ],
    correct: 1,
    explanation: "Skala besar butuh horizontal scaling (tambah server), load balancer, caching layer, database partitioning/sharding, dan CDN.",
    difficulty: "Sulit"
  },
  {
    id: 20,
    category: "System Design",
    question: "Apa itu API rate limiting?",
    options: [
      "Membatasi jumlah request yang diterima dalam waktu tertentu",
      "Mempercepat response API",
      "Menghapus API yang lambat",
      "Cara membuat API baru"
    ],
    correct: 0,
    explanation: "Rate limiting membatasi jumlah request dari satu client dalam periode waktu tertentu (misal: 100 request/menit). Mencegah abuse dan menjaga stabilitas server.",
    difficulty: "Mudah"
  },
  {
    id: 21,
    category: "System Design",
    question: "Apa perbedaan REST dan GraphQL?",
    options: [
      "REST untuk mobile, GraphQL untuk web",
      "REST: multiple endpoint, GraphQL: satu endpoint yang fleksibel",
      "REST lebih cepat dari GraphQL",
      "GraphQL tidak butuh HTTP"
    ],
    correct: 1,
    explanation: "REST punya endpoint berbeda untuk setiap resource (/users, /posts). GraphQL satu endpoint, client tentukan data apa yang mau diambil, mengurangi over-fetching.",
    difficulty: "Menengah"
  },
  {
    id: 22,
    category: "Behavioral",
    question: "Ceritakan tentang diri kamu dalam 2 menit.",
    options: [
      "Cerita panjang lebar tentang masa kecil",
      "Ringkas: latar belakang, pengalaman relevan, dan kenapa cocok untuk posisi ini",
      "Langsung bilang gaji berapa yang mau",
      "Bilang tidak ada yang menarik dari diri saya"
    ],
    correct: 1,
    explanation: "Jawaban yang baik: (1) Singkat perkenalan, (2) Pengalaman kerja/project relevan, (3) Mengapa kamu tertarik dengan posisi ini. Fokus pada value yang bisa kamu berikan.",
    difficulty: "Mudah"
  },
  {
    id: 23,
    category: "Behavioral",
    question: "Apa kelemahan terbesar kamu?",
    options: [
      "\"Saya perfeksionis\" (terlalu klise)",
      "Jujur sebut kelemahan + langkah konkret yang sedang dilakukan untuk memperbaiki",
      "\"Saya tidak punya kelemahan\"",
      "Menyalahkan orang lain"
    ],
    correct: 1,
    explanation: "Interviewer ingin melihat self-awareness. Sebut kelemahan jujur (misal: sulit delegasi) dan jelaskan apa yang kamu lakukan untuk mengatasinya.",
    difficulty: "Menengah"
  },
  {
    id: 24,
    category: "Behavioral",
    question: "Ceritakan saat kamu konflik dengan rekan kerja.",
    options: [
      "Cerita yang menyalahkan rekan kerja",
      "Situasi specific + tindakan yang diambil + hasil positif yang dicapai",
      "\"Saya tidak pernah konflik\"",
      "Cerita yang berakhir dengan saya menang"
    ],
    correct: 1,
    explanation: "Gunakan metode STAR: Situation (konteks), Task (tugas kamu), Action (yang kamu lakukan), Result (hasil positif). Fokus pada resolusi, bukan konflik.",
    difficulty: "Menengah"
  },
  {
    id: 25,
    category: "Behavioral",
    question: "Mengapa kamu tertarik bekerja di perusahaan ini?",
    options: [
      "\"Karena gajinya besar\"",
      "Riset tentang produk/misi perusahaan + hubungkan dengan goal karir kamu",
      "\"Tidak tahu, yang penting kerja\"",
      "\"Karena lowongannya ada\""
    ],
    correct: 1,
    explanation: "Tunjukkan kamu sudah riset: sebut produk spesifik, misi perusahaan, atau proyek menarik. Hubungkan dengan passion/karir kamu. Ini menunjukkan motivasi yang genuine.",
    difficulty: "Mudah"
  },
  {
    id: 26,
    category: "Behavioral",
    question: "Apa yang kamu lakukan saat deadline mepet?",
    options: [
      "Panik dan tidak bisa kerja",
      "Prioritaskan tugas, komunikasi ke tim jika ada resiko, fokus di hal krusial dulu",
      "Kerja sampai lupa makan dan tidur",
      "Minta perpanjangan waktu"
    ],
    correct: 1,
    explanation: "Interviewer ingin tahu manajemen waktu dan komunikasi. Jawaban bagus: identifikasi yang paling penting, komunikasi proaktif, dan delivery realistis.",
    difficulty: "Menengah"
  },
  {
    id: 27,
    category: "Behavioral",
    question: "Ceritakan tentang project yang paling kamu banggakan.",
    options: [
      "Project yang saya kerjakan sendirian dan selesai lebih cepat",
      "Project dengan tantangan teknis/soft skill, peran jelas, dan dampak terukur",
      "\"Saya tidak punya project yang menarik\"",
      "Project yang paling gampang"
    ],
    correct: 1,
    explanation: "Pilih project yang menunjukkan: (1) Problem solving, (2) Kolaborasi tim, (3) Dampak nyata (metrics). Jelaskan peran kamu spesifik, bukan cuma 'ikut'.",
    difficulty: "Menengah"
  },
  {
    id: 28,
    category: "Behavioral",
    question: "Bagaimana kamu belajar teknologi baru?",
    options: [
      "Tidak perlu belajar, sudah tahu semua",
      "Baca dokumentasi, bikin mini project, kontribusi open source, diskusi dengan komunitas",
      "Tunggu sampai ada training dari kantor",
      "Copy paste dari Stack Overflow"
    ],
    correct: 1,
    explanation: "Tunjukkan growth mindset: kombinasi self-learning (dokumentasi, tutorial), practice (bikin project), dan community (open source, forum). Ini yang dicari employer.",
    difficulty: "Mudah"
  },
  {
    id: 29,
    category: "Coding",
    question: "Apa itu Big O Notation untuk akses element di Array berdasarkan index?",
    options: ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
    correct: 2,
    explanation: "Array menyimpan data secara kontinu di memory. Akses berdasarkan index langsung menghitung alamat: base_address + (index * size). Selalu O(1).",
    difficulty: "Mudah"
  },
  {
    id: 30,
    category: "System Design",
    question: "Apa itu database sharding?",
    options: [
      "Membuat backup database",
      "Memecah database menjadi beberapa bagian (shard) yang tersebar di banyak server",
      "Menghapus data yang tidak terpakai",
      "Mengenkripsi database"
    ],
    correct: 1,
    explanation: "Sharding membagi data ke beberapa database server berdasarkan key tertentu (misal: user ID). Setiap shard menyimpan sebagian data, memungkinkan scale horizontal.",
    difficulty: "Sulit"
  }
];