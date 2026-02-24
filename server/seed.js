const prisma = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Seeding database...');

  let settings = await prisma.settings.findFirst();
  if (!settings) {
    await prisma.settings.create({ data: {} });
    console.log('Created default settings');
  }

  let pwa = await prisma.pwaSettings.findFirst();
  if (!pwa) {
    await prisma.pwaSettings.create({ data: {} });
    console.log('Created default PWA settings');
  }

  const adminEmail = 'admin@yokoajans.com';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash('admin123', 12);
    admin = await prisma.user.create({
      data: { username: 'admin', email: adminEmail, passwordHash, role: 'admin', vip: true }
    });
    console.log('Created admin user: admin@yokoajans.com / admin123');
  }

  const vipEmail = 'vip@yokoajans.com';
  let vipUser = await prisma.user.findUnique({ where: { email: vipEmail } });
  if (!vipUser) {
    const passwordHash = await bcrypt.hash('vip123', 12);
    vipUser = await prisma.user.create({
      data: { username: 'YıldızVIP', email: vipEmail, passwordHash, role: 'vip', vip: true }
    });
    console.log('Created VIP user');
  }

  const user2Email = 'sinema@yokoajans.com';
  let regularUser = await prisma.user.findUnique({ where: { email: user2Email } });
  if (!regularUser) {
    const passwordHash = await bcrypt.hash('user123', 12);
    regularUser = await prisma.user.create({
      data: { username: 'SinemaÂşığı', email: user2Email, passwordHash, role: 'user' }
    });
    console.log('Created regular user');
  }

  const roomCount = await prisma.room.count();
  if (roomCount === 0) {
    await prisma.room.createMany({
      data: [
        {
          title: 'Sinema Odası 1',
          description: 'Premium sinema deneyimi',
          movieTitle: 'Oppenheimer',
          posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
          isTrending: true,
          isActive: true
        },
        {
          title: 'Gerilim Gecesi',
          description: 'Korku ve gerilim sevenler için',
          movieTitle: 'John Wick 4',
          posterUrl: 'https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
          isTrending: false,
          isActive: true
        },
        {
          title: 'Aksiyon Arena',
          description: 'Nefes kesen sahneler',
          movieTitle: 'Mission Impossible',
          posterUrl: '',
          isTrending: true,
          isActive: true
        }
      ]
    });
    console.log('Created sample rooms');
  }

  const annCount = await prisma.announcement.count();
  if (annCount === 0) {
    await prisma.announcement.createMany({
      data: [
        {
          titleTR: 'YOKO AJANS\'a Hoş Geldiniz!',
          titleEN: 'Welcome to YOKO AJANS!',
          contentTR: 'Türkiye\'nin en özel sinema topluluğuna hoş geldiniz. Birlikte izleme odalarına katılın, canlı sohbet edin ve özel gösterimlerden yararlanın.',
          contentEN: 'Welcome to Turkey\'s most exclusive cinema community. Join watch party rooms, live chat, and enjoy exclusive screenings.',
          pinned: true
        },
        {
          titleTR: 'Bu Hafta Özel Gösterim',
          titleEN: 'This Week\'s Special Screening',
          contentTR: 'Bu Cuma akşamı 21:00\'de John Wick 4 özel gösterimi gerçekleşecektir. Tüm üyeler davetlidir.',
          contentEN: 'This Friday at 21:00 we will have a special screening of John Wick 4. All members are invited.',
          pinned: false
        }
      ]
    });
    console.log('Created sample announcements');
  }

  const eventCount = await prisma.event.count();
  if (eventCount === 0) {
    const tonight = new Date();
    tonight.setHours(21, 0, 0, 0);

    await prisma.event.createMany({
      data: [
        {
          titleTR: 'John Wick 4 Özel Gösterimi',
          titleEN: 'John Wick 4 Special Screening',
          descriptionTR: 'Bu Gece Özel Gösterim — Katılanlara özel rozet!',
          descriptionEN: 'Tonight\'s Special Screening — Exclusive badge for attendees!',
          startTime: tonight,
          badge: '🎁 Özel Rozet',
          isActive: true
        }
      ]
    });
    console.log('Created sample events');
  }

  console.log('Seed complete!');
}

if (require.main === module) {
  seed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

module.exports = seed;
