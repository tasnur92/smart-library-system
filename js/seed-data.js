/* ==========================================================================
   SEED DATA FOR SMART LIBRARY SYSTEM
   Realistic collection of books, categories, cover imagery, and demo records
   ========================================================================== */

export const INITIAL_BOOKS = [
  {
    id: "book_cs_01",
    isbn: "978-0132350884",
    title: "Clean Code: A Handbook of Agile Software Craftsmanship",
    author: "Robert C. Martin",
    category: "Computer Science",
    description: "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees. Learn the principles, patterns, and practices of writing clean code.",
    quantity: 5,
    available: 4,
    publicationYear: 2008,
    shelfLocation: "CS-Floor2-A1",
    coverImageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
    tags: ["software", "programming", "agile", "architecture"],
    borrowCount: 28,
    createdAt: "2026-01-10T08:00:00Z"
  },
  {
    id: "book_cs_02",
    isbn: "978-0262033848",
    title: "Introduction to Algorithms (CLRS 3rd Edition)",
    author: "Thomas H. Cormen, Charles E. Leiserson",
    category: "Computer Science",
    description: "The leading textbook on computer algorithms, covering a broad spectrum of algorithms in depth, yet making their design and analysis accessible to all levels of readers.",
    quantity: 4,
    available: 1,
    publicationYear: 2009,
    shelfLocation: "CS-Floor2-A3",
    coverImageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    tags: ["algorithms", "data structures", "computer science", "math"],
    borrowCount: 42,
    createdAt: "2026-01-11T09:00:00Z"
  },
  {
    id: "book_cs_03",
    isbn: "978-0136042594",
    title: "Artificial Intelligence: A Modern Approach",
    author: "Stuart Russell, Peter Norvig",
    category: "Artificial Intelligence",
    description: "The authoritative, comprehensive introduction to the theory and practice of artificial intelligence, including search, probabilistic reasoning, machine learning, and deep learning.",
    quantity: 3,
    available: 0, // Intentionally 0 to demonstrate reservations!
    publicationYear: 2020,
    shelfLocation: "CS-Floor2-B2",
    coverImageUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80",
    tags: ["ai", "machine learning", "neural networks", "robotics"],
    borrowCount: 56,
    createdAt: "2026-01-12T10:00:00Z"
  },
  {
    id: "book_cs_04",
    isbn: "978-1491957660",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    category: "Computer Science",
    description: "An exceptional guide to the fundamental principles, architectures, and tradeoffs of distributed databases, stream processing, reliability, and scalability.",
    quantity: 4,
    available: 3,
    publicationYear: 2017,
    shelfLocation: "CS-Floor2-A5",
    coverImageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
    tags: ["distributed systems", "database", "backend", "scalability"],
    borrowCount: 35,
    createdAt: "2026-01-13T11:00:00Z"
  },
  {
    id: "book_cs_05",
    isbn: "978-1449355730",
    title: "Learning Python: Powerful Object-Oriented Programming",
    author: "Mark Lutz",
    category: "Computer Science",
    description: "Get a comprehensive, in-depth introduction to the core Python language with this hands-on tutorial. Ideal for both beginners and experienced programmers.",
    quantity: 6,
    available: 4,
    publicationYear: 2013,
    shelfLocation: "CS-Floor2-A2",
    coverImageUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80",
    tags: ["python", "programming", "software", "backend"],
    borrowCount: 39,
    createdAt: "2026-01-14T11:30:00Z"
  },
  {
    id: "book_ai_01",
    isbn: "978-1492032649",
    title: "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow",
    author: "Aurélien Géron",
    category: "Artificial Intelligence",
    description: "Through concrete examples, minimal theory, and production-ready Python frameworks, this best-seller teaches you how to build intelligent systems from scratch.",
    quantity: 5,
    available: 3,
    publicationYear: 2022,
    shelfLocation: "CS-Floor2-B3",
    coverImageUrl: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=600&q=80",
    tags: ["machine learning", "tensorflow", "python", "neural networks", "ai"],
    borrowCount: 47,
    createdAt: "2026-01-15T09:00:00Z"
  },
  {
    id: "book_ai_02",
    isbn: "978-0262035613",
    title: "Deep Learning",
    author: "Ian Goodfellow, Yoshua Bengio, Aaron Courville",
    category: "Artificial Intelligence",
    description: "The textbook on deep learning by pioneering researchers, covering mathematical foundations, deep feedforward networks, regularization, and optimization algorithms.",
    quantity: 3,
    available: 2,
    publicationYear: 2016,
    shelfLocation: "CS-Floor2-B1",
    coverImageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    tags: ["deep learning", "neural networks", "mathematics", "ai"],
    borrowCount: 31,
    createdAt: "2026-01-16T14:00:00Z"
  },
  {
    id: "book_lit_01",
    isbn: "978-0451524935",
    title: "1984",
    author: "George Orwell",
    category: "Literature",
    description: "Winston Smith toils in the Ministry of Truth in the totalitarian superstate of Oceania. A chilling prophecy about the future of surveillance, truth, and freedom.",
    quantity: 6,
    available: 5,
    publicationYear: 1949,
    shelfLocation: "LIT-Floor1-C1",
    coverImageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
    tags: ["dystopia", "classics", "literature", "philosophy"],
    borrowCount: 65,
    createdAt: "2026-01-17T10:00:00Z"
  },
  {
    id: "book_lit_02",
    isbn: "978-0061120084",
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    category: "Literature",
    description: "A timeless masterpiece of American literature exploring racial injustice and the destruction of innocence in the deep South, seen through the eyes of young Scout Finch.",
    quantity: 4,
    available: 2,
    publicationYear: 1960,
    shelfLocation: "LIT-Floor1-C3",
    coverImageUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80",
    tags: ["classic", "fiction", "justice", "american literature"],
    borrowCount: 52,
    createdAt: "2026-01-18T10:30:00Z"
  },
  {
    id: "book_lit_03",
    isbn: "978-0441172719",
    title: "Dune",
    author: "Frank Herbert",
    category: "Science Fiction",
    description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the spice melange.",
    quantity: 5,
    available: 1,
    publicationYear: 1965,
    shelfLocation: "SF-Floor1-D4",
    coverImageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    tags: ["scifi", "space", "politics", "epic", "fantasy"],
    borrowCount: 44,
    createdAt: "2026-01-19T12:00:00Z"
  },
  {
    id: "book_sci_01",
    isbn: "978-0553380163",
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    category: "Science",
    description: "A landmark volume in science writing by one of the great minds of our time. Explores the origin of the universe, black holes, space and time, and the quest for a theory of everything.",
    quantity: 4,
    available: 3,
    publicationYear: 1988,
    shelfLocation: "SCI-Floor3-E1",
    coverImageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
    tags: ["astronomy", "physics", "cosmology", "science"],
    borrowCount: 38,
    createdAt: "2026-01-20T14:00:00Z"
  },
  {
    id: "book_sci_02",
    isbn: "978-0062316097",
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    category: "History",
    description: "From a renowned historian comes a groundbreaking narrative of humanity’s creation and evolution—exploring the ways in which biology and history have defined us and enhanced our understanding of what it means to be human.",
    quantity: 6,
    available: 4,
    publicationYear: 2014,
    shelfLocation: "HIST-Floor3-F2",
    coverImageUrl: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=600&q=80",
    tags: ["anthropology", "history", "evolution", "society"],
    borrowCount: 68,
    createdAt: "2026-01-21T09:00:00Z"
  },
  {
    id: "book_biz_01",
    isbn: "978-0062457714",
    title: "The Subtle Art of Not Giving a F*ck",
    author: "Mark Manson",
    category: "Philosophy",
    description: "A counterintuitive guide to living a good life by acknowledging our limitations and choosing what truly matters to us.",
    quantity: 3,
    available: 2,
    publicationYear: 2016,
    shelfLocation: "PHIL-Floor1-B4",
    coverImageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
    tags: ["philosophy", "self-help", "psychology", "growth"],
    borrowCount: 33,
    createdAt: "2026-01-22T10:00:00Z"
  },
  {
    id: "book_biz_02",
    isbn: "978-0307887894",
    title: "The Lean Startup",
    author: "Eric Ries",
    category: "Business",
    description: "How today's entrepreneurs use continuous innovation to create radically successful businesses. A staple for innovators, managers, and software founders.",
    quantity: 4,
    available: 3,
    publicationYear: 2011,
    shelfLocation: "BIZ-Floor3-D2",
    coverImageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
    tags: ["business", "entrepreneurship", "innovation", "management"],
    borrowCount: 29,
    createdAt: "2026-01-23T11:00:00Z"
  }
];

export const INITIAL_USERS = [
  {
    uid: "admin_master_01",
    name: "Dr. Sarah Sterling",
    email: "admin@library.edu",
    role: "admin",
    department: "Library Administration",
    avatar: "SS",
    createdAt: "2026-01-01T08:00:00Z"
  },
  {
    uid: "student_alex_01",
    name: "Alex Mercer",
    email: "alex@student.edu",
    role: "student",
    studentId: "STU-2026-049",
    department: "Computer Science",
    avatar: "AM",
    createdAt: "2026-01-05T09:30:00Z"
  },
  {
    uid: "student_emma_02",
    name: "Emma Watson",
    email: "emma@student.edu",
    role: "student",
    studentId: "STU-2026-102",
    department: "Literature & Arts",
    avatar: "EW",
    createdAt: "2026-01-06T10:15:00Z"
  }
];

export const INITIAL_BORROWINGS = [
  {
    id: "borrow_sample_01",
    userId: "student_alex_01",
    userEmail: "alex@student.edu",
    userName: "Alex Mercer",
    bookId: "book_cs_01",
    bookTitle: "Clean Code: A Handbook of Agile Software Craftsmanship",
    bookIsbn: "978-0132350884",
    issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    returnDate: null,
    status: "issued"
  },
  {
    id: "borrow_sample_02",
    userId: "student_alex_01",
    userEmail: "alex@student.edu",
    userName: "Alex Mercer",
    bookId: "book_ai_01",
    bookTitle: "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow",
    bookIsbn: "978-1492032649",
    issueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days overdue!
    returnDate: null,
    status: "issued"
  },
  {
    id: "borrow_sample_03",
    userId: "student_alex_01",
    userEmail: "alex@student.edu",
    userName: "Alex Mercer",
    bookId: "book_cs_02",
    bookTitle: "Introduction to Algorithms (CLRS 3rd Edition)",
    bookIsbn: "978-0262033848",
    issueDate: "2026-01-02T10:00:00Z",
    dueDate: "2026-01-16T10:00:00Z",
    returnDate: "2026-01-14T15:30:00Z",
    status: "returned"
  }
];

export const INITIAL_RESERVATIONS = [
  {
    id: "res_sample_01",
    userId: "student_alex_01",
    userEmail: "alex@student.edu",
    userName: "Alex Mercer",
    bookId: "book_cs_03",
    bookTitle: "Artificial Intelligence: A Modern Approach",
    reservationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active"
  }
];

export const INITIAL_FINES = [
  {
    id: "fine_sample_01",
    userId: "student_alex_01",
    borrowingId: "borrow_sample_02",
    bookTitle: "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow",
    amount: 6.00, // $1/day overdue
    daysOverdue: 6,
    status: "unpaid",
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: "notif_sample_01",
    userId: "student_alex_01",
    title: "Overdue Warning",
    message: "Your loan for 'Hands-On Machine Learning' is 6 days overdue. Please return it to prevent additional fines.",
    type: "warning",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    read: false
  },
  {
    id: "notif_sample_02",
    userId: "student_alex_01",
    title: "Reservation Received",
    message: "You have successfully reserved 'Artificial Intelligence: A Modern Approach'. We will notify you once a copy is returned.",
    type: "info",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: true
  }
];
