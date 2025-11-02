// seed-data.js - Extended event catalog with geographic coordinates

module.exports = {
  events: [
    {
      id: 1,
      title: 'Abdul Majeed Abdullah Concert',
      category: 'Concerts',
      city: 'Riyadh',
      venue: 'Riyadh Boulevard',
      date: '2025-11-15',
      time: '20:00',
      price: 350,
      image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop',
      description: 'Experience an unforgettable evening with the legendary Abdul Majeed Abdullah at Riyadh Boulevard. Join us for a spectacular concert featuring beloved classics and new hits.',
      promotion: true,
      lat: 24.7465,
      lng: 46.6653
    },
    {
      id: 2,
      title: 'The Godfather - Classic Cinema',
      category: 'Movies',
      city: 'Jeddah',
      venue: 'VOX Cinemas Red Sea Mall',
      date: '2025-10-20',
      time: '19:30',
      price: 45,
      image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop',
      description: 'Watch the timeless masterpiece The Godfather on the big screen. Experience this cinematic classic in stunning clarity with premium sound.',
      promotion: false,
      lat: 21.5505,
      lng: 39.1505
    },
    {
      id: 3,
      title: 'Al Nassr vs Al Ittihad',
      category: 'Sports',
      city: 'Riyadh',
      venue: 'King Fahd International Stadium',
      date: '2025-10-25',
      time: '18:00',
      price: 150,
      image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop',
      description: 'Witness the epic clash between Al Nassr and Al Ittihad. Don\'t miss this thrilling match featuring world-class players in an electrifying atmosphere.',
      promotion: true,
      lat: 24.6895,
      lng: 46.6908
    },
    {
      id: 4,
      title: 'Riyadh Season Festival',
      category: 'Festivals',
      city: 'Riyadh',
      venue: 'Boulevard Riyadh City',
      date: '2025-12-01',
      time: '17:00',
      price: 80,
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop',
      description: 'Join the biggest entertainment festival in the region! Experience world-class performances, international artists, thrilling rides, and amazing food from around the world.',
      promotion: true,
      lat: 24.7765,
      lng: 46.6977
    },
    {
      id: 5,
      title: "Shakespeare's Hamlet",
      category: 'Theatre',
      city: 'Jeddah',
      venue: 'King Abdullah Cultural Center',
      date: '2025-11-10',
      time: '20:30',
      price: 120,
      image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=600&fit=crop',
      description: 'Experience Shakespeare\'s greatest tragedy brought to life by an acclaimed international theatre troupe. A powerful performance of timeless drama.',
      promotion: false,
      lat: 21.4858,
      lng: 39.1925
    },
    {
      id: 6,
      title: 'Saudi National Day Celebration',
      category: 'Festivals',
      city: 'Dammam',
      venue: 'King Fahd Park',
      date: '2025-09-23',
      time: '16:00',
      price: 0,
      image: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800&h=600&fit=crop',
      description: 'Celebrate Saudi National Day with spectacular fireworks, traditional performances, cultural exhibits, and family-friendly activities. Free entry for all!',
      promotion: true,
      lat: 26.3927,
      lng: 49.9777
    },
    {
      id: 7,
      title: 'Formula E Diriyah E-Prix',
      category: 'Sports',
      city: 'Riyadh',
      venue: 'Diriyah Street Circuit',
      date: '2025-12-15',
      time: '15:00',
      price: 450,
      image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&h=600&fit=crop',
      description: 'Experience the thrill of electric racing at the Diriyah E-Prix. Watch the world\'s best drivers compete in the cutting-edge Formula E championship.',
      promotion: false,
      lat: 24.7324,
      lng: 46.5738
    },
    {
      id: 8,
      title: 'Dune: Part Two',
      category: 'Movies',
      city: 'Riyadh',
      venue: 'Muvi Cinemas The Esplanade',
      date: '2025-10-18',
      time: '21:00',
      price: 55,
      image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=600&fit=crop',
      description: 'The epic saga continues in Dune: Part Two. Experience the stunning visuals and compelling story on the biggest screen with immersive Dolby Atmos sound.',
      promotion: false,
      lat: 24.7136,
      lng: 46.6753
    }
  ],
  promotions: [
    { id: 'SAUDIDAY25', title: 'Saudi Day 25% Off', discount: 25, active: true },
    { id: 'STUDENT15', title: 'Student 15% Off', discount: 15, active: true }
  ],
  users: [
    { id: 'u1', name: 'Admin', email: 'admin@ticketo.sa', password: 'admin', role: 'admin' }
  ],
  bookings: []
};
