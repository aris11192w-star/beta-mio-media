const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

// Inisialisasi aplikasi Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));
// Sajikan file statis dari folder public
app.use(express.static('public'));

// Konfigurasi session
app.use(session({
  secret: 'mio-media-secret-key-' + crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 hari
}));

// Setup multer untuk upload file post (MULTIPLE FILES)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'uploads/';
    if (file.mimetype.startsWith('image/')) {
      folder += 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      folder += 'videos/';
    } else if (file.mimetype.startsWith('audio/')) {
      folder += 'music/';
    }
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = file.fieldname.startsWith('media') ? 'media' : 
                   file.fieldname === 'music' ? 'music' : 'file';
    cb(null, prefix + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB total
    files: 6 // max 6 files (5 media + 1 music)
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname.startsWith('media')) {
      if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Media harus gambar atau video!'), false);
      }
    } else if (file.fieldname === 'music') {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('File harus audio!'), false);
      }
    } else {
      cb(new Error('Field tidak dikenal'), false);
    }
  }
});

// Setup multer untuk upload profil dan wallpaper
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = 'uploads/profiles/';
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const userId = req.session.userId || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${userId}-${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya gambar yang diizinkan!'), false);
  }
});

// Setup multer untuk upload media komentar (ukuran kecil)
const commentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = 'uploads/comments/';
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'comment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const commentUpload = multer({
  storage: commentStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Max 2MB (ukuran kecil seperti sticker)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya gambar dan video yang diizinkan!'), false);
    }
  }
});

// Setup multer untuk upload media chat
const chatStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'uploads/chat/';
    if (file.mimetype.startsWith('image/')) {
      folder += 'images/';
    } else if (file.mimetype.startsWith('video/')) {
      folder += 'videos/';
    } else if (file.mimetype.startsWith('audio/')) {
      folder += 'audio/';
    }
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB untuk chat
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya gambar, video, dan audio yang diizinkan!'), false);
    }
  }
});

// Setup multer untuk upload foto grup
const groupStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = 'uploads/groups/';
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'group-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const groupUpload = multer({
  storage: groupStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya gambar yang diizinkan!'), false);
    }
  }
});

// Inisialisasi file data
function initializeDataFiles() {
  const dataDir = './data';
  const uploadsDir = './uploads';
  const imagesDir = './uploads/images';
  const videosDir = './uploads/videos';
  const profilesDir = './uploads/profiles';
  const commentsDir = './uploads/comments';
  const musicDir = './uploads/music';
  const chatDir = './uploads/chat';
  const chatImagesDir = './uploads/chat/images';
  const chatVideosDir = './uploads/chat/videos';
  const chatAudioDir = './uploads/chat/audio';
  const groupsDir = './uploads/groups';
  
  [dataDir, uploadsDir, imagesDir, videosDir, profilesDir, commentsDir, musicDir, chatDir, chatImagesDir, chatVideosDir, chatAudioDir, groupsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const files = {
    'data/login.json': { users: [], adminUsers: [] },
    'data/user.json': {},
    'data/database.json': { posts: [], comments: [], likes: [] },
    'data/setting.user.json': {},
    'data/verified.users.json': { verified: [] },
    'data/saved.login.json': { savedLogins: [], rememberTokens: {} },
    'data/messages.json': { conversations: {}, lastMessages: [] },
    'data/follow.data.json': { followers: {}, following: {}, followRequests: {} },
    'data/groups.json': { groups: [], groupMessages: {} } // File untuk grup
  };

  Object.entries(files).forEach(([filePath, defaultData]) => {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    } else {
      try {
        const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        Object.keys(defaultData).forEach(key => {
          if (existingData[key] === undefined) existingData[key] = defaultData[key];
        });
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
      } catch (error) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      }
    }
  });

  // Jadikan user pertama sebagai admin
  try {
    const loginData = JSON.parse(fs.readFileSync('data/login.json', 'utf8'));
    if (!loginData.adminUsers) loginData.adminUsers = [];
    if (loginData.users.length > 0 && loginData.adminUsers.length === 0) {
      const firstUser = loginData.users[0];
      loginData.adminUsers.push(firstUser.id);
      const verifiedData = JSON.parse(fs.readFileSync('data/verified.users.json', 'utf8'));
      if (!verifiedData.verified) verifiedData.verified = [];
      if (!verifiedData.verified.includes(firstUser.id)) {
        verifiedData.verified.push(firstUser.id);
        fs.writeFileSync('data/verified.users.json', JSON.stringify(verifiedData, null, 2));
      }
      fs.writeFileSync('data/login.json', JSON.stringify(loginData, null, 2));
    }
  } catch (error) {}
}

initializeDataFiles();

// Helper functions
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    return false;
  }
}

// Fungsi untuk mendapatkan user by id
function getUserById(userId) {
  const userData = readJSON('data/user.json');
  return userData[userId] || null;
}

// Fungsi untuk mendapatkan user by username
function getUserByUsername(username) {
  const loginData = readJSON('data/login.json');
  const user = loginData.users.find(u => u.username === username);
  if (!user) return null;
  return getUserById(user.id);
}

// Cek admin global
function isAdmin(userId) {
  const loginData = readJSON('data/login.json');
  return loginData.adminUsers && loginData.adminUsers.includes(userId);
}

// Cek verified
function isVerified(userId) {
  const verifiedData = readJSON('data/verified.users.json');
  return verifiedData.verified && verifiedData.verified.includes(userId);
}

// Generate remember token
function generateRememberToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Simpan remember token
function saveRememberToken(userId, username) {
  const savedData = readJSON('data/saved.login.json');
  const token = generateRememberToken();
  const expires = Date.now() + (30 * 24 * 60 * 60 * 1000);
  if (!savedData.rememberTokens) savedData.rememberTokens = {};
  savedData.rememberTokens[token] = { userId, username, expires };
  writeJSON('data/saved.login.json', savedData);
  return token;
}

// Validasi remember token
function validateRememberToken(token) {
  const savedData = readJSON('data/saved.login.json');
  if (!savedData.rememberTokens || !savedData.rememberTokens[token]) return null;
  const tokenData = savedData.rememberTokens[token];
  if (tokenData.expires < Date.now()) {
    delete savedData.rememberTokens[token];
    writeJSON('data/saved.login.json', savedData);
    return null;
  }
  tokenData.expires = Date.now() + (30 * 24 * 60 * 60 * 1000);
  savedData.rememberTokens[token] = tokenData;
  writeJSON('data/saved.login.json', savedData);
  return tokenData;
}

// Hapus remember token
function removeRememberToken(token) {
  const savedData = readJSON('data/saved.login.json');
  if (savedData.rememberTokens && savedData.rememberTokens[token]) {
    delete savedData.rememberTokens[token];
    writeJSON('data/saved.login.json', savedData);
  }
}

// Follow functions
function getFollowStatus(userId, targetUserId) {
  const followData = readJSON('data/follow.data.json');
  const isFollowing = followData.following[userId] && followData.following[userId].includes(targetUserId);
  const isFollowedBack = followData.followers[userId] && followData.followers[userId].includes(targetUserId);
  return {
    isFollowing: isFollowing || false,
    isFollowedBack: isFollowedBack || false,
    followersCount: followData.followers[targetUserId] ? followData.followers[targetUserId].length : 0,
    followingCount: followData.following[targetUserId] ? followData.following[targetUserId].length : 0
  };
}

function toggleFollow(userId, targetUserId) {
  const followData = readJSON('data/follow.data.json');
  if (!followData.following[userId]) followData.following[userId] = [];
  if (!followData.followers[targetUserId]) followData.followers[targetUserId] = [];

  const followingIndex = followData.following[userId].indexOf(targetUserId);
  let action = 'follow';
  if (followingIndex === -1) {
    followData.following[userId].push(targetUserId);
    followData.followers[targetUserId].push(userId);
    action = 'follow';
  } else {
    followData.following[userId].splice(followingIndex, 1);
    const followerIndex = followData.followers[targetUserId].indexOf(userId);
    followData.followers[targetUserId].splice(followerIndex, 1);
    action = 'unfollow';
  }

  // Update counts di user.json
  const userData = readJSON('data/user.json');
  if (userData[userId]) userData[userId].following = followData.following[userId].length;
  if (userData[targetUserId]) userData[targetUserId].followers = followData.followers[targetUserId].length;
  writeJSON('data/user.json', userData);
  writeJSON('data/follow.data.json', followData);

  return {
    success: true,
    action,
    followersCount: followData.followers[targetUserId] ? followData.followers[targetUserId].length : 0,
    followingCount: followData.following[userId] ? followData.following[userId].length : 0
  };
}

// Chat functions (personal)
function getConversationId(user1Id, user2Id) {
  return [user1Id, user2Id].sort().join('_');
}

function saveMessage(senderId, receiverId, text, mediaUrl = null, mediaType = null) {
  const messagesData = readJSON('data/messages.json');
  const conversationId = getConversationId(senderId, receiverId);
  const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  if (!messagesData.conversations) messagesData.conversations = {};
  if (!messagesData.conversations[conversationId]) {
    messagesData.conversations[conversationId] = {
      participants: [senderId, receiverId],
      messages: [],
      lastMessageAt: null,
      unreadCount: {}
    };
  }

  if (!messagesData.conversations[conversationId].unreadCount[senderId]) messagesData.conversations[conversationId].unreadCount[senderId] = 0;
  if (!messagesData.conversations[conversationId].unreadCount[receiverId]) messagesData.conversations[conversationId].unreadCount[receiverId] = 0;

  const newMessage = {
    id: messageId,
    senderId,
    receiverId,
    text: text || '',
    mediaUrl,
    mediaType,
    timestamp: new Date().toISOString(),
    read: false
  };

  messagesData.conversations[conversationId].messages.push(newMessage);
  messagesData.conversations[conversationId].lastMessageAt = new Date().toISOString();
  messagesData.conversations[conversationId].unreadCount[receiverId] = (messagesData.conversations[conversationId].unreadCount[receiverId] || 0) + 1;

  if (!messagesData.lastMessages) messagesData.lastMessages = [];
  const existingIndex = messagesData.lastMessages.findIndex(msg => msg.conversationId === conversationId);
  
  let lastMessageText = '';
  if (mediaUrl) {
    if (mediaType === 'image') lastMessageText = '📷 Gambar';
    else if (mediaType === 'video') lastMessageText = '🎬 Video';
    else if (mediaType === 'audio') lastMessageText = '🎵 Audio';
    else lastMessageText = text || 'Media';
  } else {
    lastMessageText = text || '';
  }
  
  const lastMessageInfo = {
    conversationId,
    participants: [senderId, receiverId],
    lastMessage: lastMessageText,
    lastMessageAt: new Date().toISOString(),
    lastSenderId: senderId,
    unreadCount: messagesData.conversations[conversationId].unreadCount
  };
  
  if (existingIndex !== -1) {
    messagesData.lastMessages[existingIndex] = lastMessageInfo;
  } else {
    messagesData.lastMessages.push(lastMessageInfo);
  }
  messagesData.lastMessages.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

  writeJSON('data/messages.json', messagesData);
  return newMessage;
}

function markMessagesAsRead(conversationId, userId) {
  const messagesData = readJSON('data/messages.json');
  if (messagesData.conversations[conversationId]) {
    messagesData.conversations[conversationId].messages.forEach(msg => {
      if (msg.receiverId === userId && !msg.read) msg.read = true;
    });
    messagesData.conversations[conversationId].unreadCount[userId] = 0;
    const lastMsgIndex = messagesData.lastMessages.findIndex(msg => msg.conversationId === conversationId);
    if (lastMsgIndex !== -1) {
      messagesData.lastMessages[lastMsgIndex].unreadCount[userId] = 0;
    }
    writeJSON('data/messages.json', messagesData);
    return true;
  }
  return false;
}

function getUserConversations(userId) {
  const messagesData = readJSON('data/messages.json');
  const userData = readJSON('data/user.json');
  if (!messagesData.lastMessages) return [];
  return messagesData.lastMessages.filter(conv => conv.participants.includes(userId)).map(conv => {
    const otherUserId = conv.participants.find(id => id !== userId);
    const otherUser = userData[otherUserId] || { username: 'Unknown User' };
    const unreadCount = conv.unreadCount ? (conv.unreadCount[userId] || 0) : 0;
    return {
      conversationId: conv.conversationId,
      otherUserId,
      otherUsername: otherUser.username,
      otherUserProfilePic: otherUser.profilePic || '',
      lastMessage: conv.lastMessage || '',
      lastMessageAt: conv.lastMessageAt,
      unreadCount,
      isVerified: isVerified(otherUserId)
    };
  });
}

// ==================== GROUP FUNCTIONS ====================

// Dapatkan semua grup untuk user
function getUserGroups(userId) {
  const groupsData = readJSON('data/groups.json');
  const userGroups = groupsData.groups.filter(group => group.members.includes(userId));
  
  // Tambahkan info tambahan
  return userGroups.map(group => {
    const messages = groupsData.groupMessages[group.id] || [];
    const unreadCount = messages.filter(msg => 
      !msg.readBy?.includes(userId) && msg.senderId !== userId
    ).length;
    
    const lastMessage = messages[messages.length - 1];
    
    return {
      ...group,
      unreadCount,
      lastMessage: lastMessage?.text || '',
      lastMessageAt: lastMessage?.timestamp || group.createdAt,
      lastSenderId: lastMessage?.senderId
    };
  });
}

// Dapatkan pesan grup
function getGroupMessages(groupId, userId) {
  const groupsData = readJSON('data/groups.json');
  const group = groupsData.groups.find(g => g.id === groupId);
  
  if (!group || !group.members.includes(userId)) {
    return null;
  }
  
  const messages = groupsData.groupMessages[groupId] || [];
  const userData = readJSON('data/user.json');
  
  return messages.map(msg => ({
    ...msg,
    sender: userData[msg.senderId] ? {
      id: msg.senderId,
      username: userData[msg.senderId].username,
      profilePic: userData[msg.senderId].profilePic,
      isVerified: isVerified(msg.senderId)
    } : { username: 'Unknown User' }
  }));
}

// Simpan pesan grup
function saveGroupMessage(groupId, senderId, text, mediaUrl = null, mediaType = null) {
  const groupsData = readJSON('data/groups.json');
  const group = groupsData.groups.find(g => g.id === groupId);
  
  if (!group || !group.members.includes(senderId)) {
    return null;
  }
  
  if (!groupsData.groupMessages) groupsData.groupMessages = {};
  if (!groupsData.groupMessages[groupId]) groupsData.groupMessages[groupId] = [];
  
  const messageId = 'grpmsg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const newMessage = {
    id: messageId,
    groupId,
    senderId,
    text: text || '',
    mediaUrl,
    mediaType,
    timestamp: new Date().toISOString(),
    readBy: [senderId] // Penanda sudah dibaca oleh pengirim
  };
  
  groupsData.groupMessages[groupId].push(newMessage);
  writeJSON('data/groups.json', groupsData);
  
  return newMessage;
}

// Tandai pesan grup sebagai dibaca
function markGroupMessagesAsRead(groupId, userId) {
  const groupsData = readJSON('data/groups.json');
  const group = groupsData.groups.find(g => g.id === groupId);
  
  if (!group || !group.members.includes(userId)) {
    return false;
  }
  
  if (groupsData.groupMessages[groupId]) {
    groupsData.groupMessages[groupId].forEach(msg => {
      if (!msg.readBy) msg.readBy = [];
      if (!msg.readBy.includes(userId) && msg.senderId !== userId) {
        msg.readBy.push(userId);
      }
    });
    writeJSON('data/groups.json', groupsData);
  }
  
  return true;
}

// Middleware autentikasi
function requireLogin(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    // Cek remember token
    const token = req.cookies?.rememberToken;
    if (token) {
      const tokenData = validateRememberToken(token);
      if (tokenData) {
        req.session.userId = tokenData.userId;
        req.session.username = tokenData.username;
        return next();
      }
    }
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Middleware admin
function requireAdmin(req, res, next) {
  if (req.session.userId && isAdmin(req.session.userId)) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Admin only' });
  }
}

// Route utama untuk mengirim index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== API Routes ====================

// Register
app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

  const loginData = readJSON('data/login.json');
  if (loginData.users.some(u => u.username === username)) {
    return res.status(400).json({ error: 'Username sudah digunakan' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  loginData.users.push({
    id: userId,
    username,
    password: hashedPassword,
    email: email || '',
    createdAt: new Date().toISOString()
  });
  writeJSON('data/login.json', loginData);

  // Buat profil user
  const userData = readJSON('data/user.json');
  userData[userId] = {
    id: userId,
    username,
    email: email || '',
    profilePic: '',
    wallpaper: '',
    bio: '',
    followers: 0,
    following: 0,
    posts: 0,
    createdAt: new Date().toISOString()
  };
  writeJSON('data/user.json', userData);

  res.json({ success: true, userId });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password, rememberMe } = req.body;
  const loginData = readJSON('data/login.json');
  const user = loginData.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Username atau password salah' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Username atau password salah' });

  req.session.userId = user.id;
  req.session.username = user.username;

  let token = null;
  if (rememberMe) {
    token = saveRememberToken(user.id, user.username);
    res.cookie('rememberToken', token, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
  }

  res.json({ success: true, userId: user.id, username: user.username, token });
});

// Logout
app.post('/api/logout', (req, res) => {
  const token = req.cookies?.rememberToken;
  if (token) removeRememberToken(token);
  req.session.destroy();
  res.clearCookie('connect.sid');
  res.clearCookie('rememberToken');
  res.json({ success: true });
});

// Get current user
app.get('/api/me', requireLogin, (req, res) => {
  const user = getUserById(req.session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id,
    username: user.username,
    profilePic: user.profilePic,
    wallpaper: user.wallpaper,
    bio: user.bio,
    followers: user.followers,
    following: user.following,
    posts: user.posts,
    isVerified: isVerified(user.id),
    isAdmin: isAdmin(user.id)
  });
});

// Get user profile by id
app.get('/api/profile/:userId', requireLogin, (req, res) => {
  const targetId = req.params.userId;
  const user = getUserById(targetId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Hitung total likes dari semua postingan user
  const database = readJSON('data/database.json');
  const userPosts = (database.posts || []).filter(post => post.userId === targetId);
  const totalLikes = userPosts.reduce((sum, post) => sum + (post.likes ? post.likes.length : 0), 0);

  const followStatus = getFollowStatus(req.session.userId, targetId);
  res.json({
    id: user.id,
    username: user.username,
    profilePic: user.profilePic,
    wallpaper: user.wallpaper,
    bio: user.bio,
    followers: followStatus.followersCount,
    following: followStatus.followingCount,
    posts: user.posts,
    totalLikes: totalLikes, // tambahan
    isVerified: isVerified(targetId),
    isAdmin: isAdmin(targetId),
    isFollowing: followStatus.isFollowing,
    isFollowedBack: followStatus.isFollowedBack
  });
});

// Update profil (bio, dll)
app.post('/api/profile/update', requireLogin, (req, res) => {
  const { bio } = req.body;
  const userData = readJSON('data/user.json');
  if (!userData[req.session.userId]) return res.status(404).json({ error: 'User not found' });
  userData[req.session.userId].bio = bio || userData[req.session.userId].bio;
  writeJSON('data/user.json', userData);
  res.json({ success: true });
});

// Upload profile picture
app.post('/api/profile/upload-pic', requireLogin, profileUpload.fields([{ name: 'profilePic', maxCount: 1 }, { name: 'wallpaper', maxCount: 1 }]), (req, res) => {
  const userData = readJSON('data/user.json');
  if (req.files['profilePic']) {
    const profilePicPath = '/uploads/profiles/' + req.files['profilePic'][0].filename;
    userData[req.session.userId].profilePic = profilePicPath;
  }
  if (req.files['wallpaper']) {
    const wallpaperPath = '/uploads/profiles/' + req.files['wallpaper'][0].filename;
    userData[req.session.userId].wallpaper = wallpaperPath;
  }
  writeJSON('data/user.json', userData);
  res.json({ success: true, profilePic: userData[req.session.userId].profilePic, wallpaper: userData[req.session.userId].wallpaper });
});

// Upload post dengan multiple files
app.post('/api/upload', requireLogin, (req, res) => {
  // Gunakan multer array untuk menangani multiple files
  const uploadMiddleware = upload.fields([
    { name: 'media0', maxCount: 1 },
    { name: 'media1', maxCount: 1 },
    { name: 'media2', maxCount: 1 },
    { name: 'media3', maxCount: 1 },
    { name: 'media4', maxCount: 1 },
    { name: 'music', maxCount: 1 }
  ]);

  uploadMiddleware(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message });
    } else if (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: err.message });
    }

    try {
      const { caption, fileCount } = req.body;
      const files = req.files;
      
      console.log('Received upload request:', { fileCount, files: Object.keys(files || {}) });

      if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({ error: 'Tidak ada file yang diupload' });
      }

      // Kumpulkan semua media files
      const mediaFiles = [];
      const count = parseInt(fileCount) || 0;
      
      for (let i = 0; i < count; i++) {
        const key = `media${i}`;
        if (files[key] && files[key][0]) {
          mediaFiles.push(files[key][0]);
        }
      }

      if (mediaFiles.length === 0) {
        return res.status(400).json({ error: 'Tidak ada media yang valid' });
      }

      // Proses music file jika ada
      const musicFile = files.music ? files.music[0] : null;

      // Buat array media URLs
      const mediaArray = mediaFiles.map(file => ({
        mediaUrl: '/uploads/' + (file.mimetype.startsWith('image/') ? 'images/' : 'videos/') + file.filename,
        mediaType: file.mimetype.startsWith('image/') ? 'image' : 'video'
      }));

      // Simpan ke database
      const database = readJSON('data/database.json');
      const postId = 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const newPost = {
        id: postId,
        userId: req.session.userId,
        username: req.session.username,
        mediaArray: mediaArray,
        mediaUrl: mediaArray[0].mediaUrl, // Untuk backward compatibility
        mediaType: mediaArray[0].mediaType,
        caption: caption || '',
        likes: [],
        comments: [],
        musicUrl: musicFile ? '/uploads/music/' + musicFile.filename : null,
        musicName: musicFile ? musicFile.originalname : null,
        createdAt: new Date().toISOString()
      };
      
      if (!database.posts) database.posts = [];
      database.posts.push(newPost);
      writeJSON('data/database.json', database);

      // Update post count user
      const userData = readJSON('data/user.json');
      userData[req.session.userId].posts = (userData[req.session.userId].posts || 0) + 1;
      writeJSON('data/user.json', userData);

      res.json({ 
        success: true, 
        post: newPost,
        mediaCount: mediaArray.length,
        hasMusic: !!musicFile
      });

    } catch (error) {
      console.error('Error processing upload:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

// Upload media untuk komentar
app.post('/api/comment/upload-media', requireLogin, commentUpload.single('media'), (req, res) => {
  console.log('Upload comment media - req.file:', req.file);
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'Tidak ada file yang diupload' });
  }

  const mediaUrl = '/uploads/comments/' + req.file.filename;
  const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
  
  console.log('Upload success:', { mediaUrl, mediaType });
  
  res.json({
    success: true,
    mediaUrl,
    mediaType,
    filename: req.file.filename
  });
});

// Upload media untuk chat
app.post('/api/chat/upload-media', requireLogin, chatUpload.single('media'), (req, res) => {
  console.log('Upload chat media - req.file:', req.file);
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'Tidak ada file yang diupload' });
  }

  let mediaUrl = '';
  let mediaType = '';
  
  if (req.file.mimetype.startsWith('image/')) {
    mediaUrl = '/uploads/chat/images/' + req.file.filename;
    mediaType = 'image';
  } else if (req.file.mimetype.startsWith('video/')) {
    mediaUrl = '/uploads/chat/videos/' + req.file.filename;
    mediaType = 'video';
  } else if (req.file.mimetype.startsWith('audio/')) {
    mediaUrl = '/uploads/chat/audio/' + req.file.filename;
    mediaType = 'audio';
  }
  
  console.log('Upload success:', { mediaUrl, mediaType });
  
  res.json({
    success: true,
    mediaUrl,
    mediaType,
    filename: req.file.filename
  });
});

// Upload audio untuk chat
app.post('/api/chat/upload-audio', requireLogin, chatUpload.single('audio'), (req, res) => {
  console.log('Upload chat audio - req.file:', req.file);
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'Tidak ada file yang diupload' });
  }

  const audioUrl = '/uploads/chat/audio/' + req.file.filename;
  
  console.log('Upload success:', { audioUrl });
  
  res.json({
    success: true,
    audioUrl,
    filename: req.file.filename
  });
});

// ==================== GROUP API ROUTES ====================

// Buat grup baru
app.post('/api/groups/create', requireLogin, groupUpload.single('groupPic'), (req, res) => {
  try {
    const { name, members } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nama grup wajib diisi' });
    }
    
    // Parse members dari string JSON
    let memberList = [];
    try {
      memberList = JSON.parse(members);
    } catch (e) {
      return res.status(400).json({ error: 'Format members tidak valid' });
    }
    
    // Tambahkan creator sebagai member
    const allMembers = [req.session.userId, ...memberList];
    const uniqueMembers = [...new Set(allMembers)];
    
    const groupsData = readJSON('data/groups.json');
    const groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const newGroup = {
      id: groupId,
      name,
      avatar: req.file ? '/uploads/groups/' + req.file.filename : null,
      members: uniqueMembers,
      admins: [req.session.userId], // Creator jadi admin
      createdAt: new Date().toISOString(),
      createdBy: req.session.userId
    };
    
    groupsData.groups.push(newGroup);
    writeJSON('data/groups.json', groupsData);
    
    res.json({ success: true, group: newGroup });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dapatkan semua grup untuk user
app.get('/api/groups', requireLogin, (req, res) => {
  const groups = getUserGroups(req.session.userId);
  res.json({ groups });
});

// Dapatkan detail grup
app.get('/api/groups/:groupId', requireLogin, (req, res) => {
  const groupId = req.params.groupId;
  const groupsData = readJSON('data/groups.json');
  const group = groupsData.groups.find(g => g.id === groupId);
  
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  if (!group.members.includes(req.session.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Tambahkan informasi user untuk setiap member
  const userData = readJSON('data/user.json');
  const membersWithInfo = group.members.map(memberId => ({
    id: memberId,
    username: userData[memberId]?.username || 'Unknown',
    profilePic: userData[memberId]?.profilePic || '',
    isVerified: isVerified(memberId),
    isAdmin: group.admins.includes(memberId)
  }));
  
  res.json({
    ...group,
    members: membersWithInfo
  });
});

// Dapatkan pesan grup
app.get('/api/groups/:groupId/messages', requireLogin, (req, res) => {
  const groupId = req.params.groupId;
  const messages = getGroupMessages(groupId, req.session.userId);
  
  if (messages === null) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Tandai sebagai dibaca
  markGroupMessagesAsRead(groupId, req.session.userId);
  
  res.json({ messages });
});

// Kirim pesan ke grup
app.post('/api/groups/:groupId/send', requireLogin, (req, res) => {
  const groupId = req.params.groupId;
  const { text, mediaUrl, mediaType } = req.body;
  
  if (!text && !mediaUrl) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
  }
  
  const newMessage = saveGroupMessage(groupId, req.session.userId, text, mediaUrl, mediaType);
  
  if (!newMessage) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json({ success: true, message: newMessage });
});

// Update grup (hanya admin)
app.post('/api/groups/:groupId/update', requireLogin, groupUpload.single('groupPic'), (req, res) => {
  const groupId = req.params.groupId;
  const { name } = req.body;
  
  const groupsData = readJSON('data/groups.json');
  const groupIndex = groupsData.groups.findIndex(g => g.id === groupId);
  
  if (groupIndex === -1) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  const group = groupsData.groups[groupIndex];
  
  // Cek apakah user adalah admin
  if (!group.admins.includes(req.session.userId)) {
    return res.status(403).json({ error: 'Hanya admin yang bisa mengedit grup' });
  }
  
  if (name) group.name = name;
  if (req.file) group.avatar = '/uploads/groups/' + req.file.filename;
  
  groupsData.groups[groupIndex] = group;
  writeJSON('data/groups.json', groupsData);
  
  res.json({ success: true, group });
});

// Tambah anggota ke grup (hanya admin)
app.post('/api/groups/:groupId/add-members', requireLogin, (req, res) => {
  const groupId = req.params.groupId;
  const { members } = req.body;
  
  const groupsData = readJSON('data/groups.json');
  const groupIndex = groupsData.groups.findIndex(g => g.id === groupId);
  
  if (groupIndex === -1) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  const group = groupsData.groups[groupIndex];
  
  if (!group.admins.includes(req.session.userId)) {
    return res.status(403).json({ error: 'Hanya admin yang bisa menambah anggota' });
  }
  
  // Tambah anggota baru
  const newMembers = members.filter(m => !group.members.includes(m));
  group.members = [...group.members, ...newMembers];
  
  groupsData.groups[groupIndex] = group;
  writeJSON('data/groups.json', groupsData);
  
  res.json({ success: true, group });
});

// Keluarkan anggota dari grup (hanya admin)
app.post('/api/groups/:groupId/remove-member', requireLogin, (req, res) => {
  const groupId = req.params.groupId;
  const { memberId } = req.body;
  
  const groupsData = readJSON('data/groups.json');
  const groupIndex = groupsData.groups.findIndex(g => g.id === groupId);
  
  if (groupIndex === -1) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  const group = groupsData.groups[groupIndex];
  
  if (!group.admins.includes(req.session.userId)) {
    return res.status(403).json({ error: 'Hanya admin yang bisa mengeluarkan anggota' });
  }
  
  if (memberId === req.session.userId) {
    return res.status(400).json({ error: 'Admin tidak bisa mengeluarkan diri sendiri' });
  }
  
  // Hapus dari members dan admins
  group.members = group.members.filter(id => id !== memberId);
  group.admins = group.admins.filter(id => id !== memberId);
  
  groupsData.groups[groupIndex] = group;
  writeJSON('data/groups.json', groupsData);
  
  res.json({ success: true });
});

// Jadikan admin (hanya admin)
app.post('/api/groups/:groupId/make-admin', requireLogin, (req, res) => {
  const groupId = req.params.groupId;
  const { memberId } = req.body;
  
  const groupsData = readJSON('data/groups.json');
  const groupIndex = groupsData.groups.findIndex(g => g.id === groupId);
  
  if (groupIndex === -1) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  const group = groupsData.groups[groupIndex];
  
  if (!group.admins.includes(req.session.userId)) {
    return res.status(403).json({ error: 'Hanya admin yang bisa menjadikan admin' });
  }
  
  if (!group.admins.includes(memberId) && group.members.includes(memberId)) {
    group.admins.push(memberId);
  }
  
  groupsData.groups[groupIndex] = group;
  writeJSON('data/groups.json', groupsData);
  
  res.json({ success: true });
});

// Hapus grup (hanya admin)
app.delete('/api/groups/:groupId/delete', requireLogin, (req, res) => {
  const groupId = req.params.groupId;
  
  const groupsData = readJSON('data/groups.json');
  const groupIndex = groupsData.groups.findIndex(g => g.id === groupId);
  
  if (groupIndex === -1) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  const group = groupsData.groups[groupIndex];
  
  if (!group.admins.includes(req.session.userId)) {
    return res.status(403).json({ error: 'Hanya admin yang bisa menghapus grup' });
  }
  
  // Hapus grup dan semua pesannya
  groupsData.groups.splice(groupIndex, 1);
  delete groupsData.groupMessages[groupId];
  
  writeJSON('data/groups.json', groupsData);
  
  res.json({ success: true });
});

// Keluar dari grup (untuk member biasa)
app.post('/api/groups/:groupId/leave', requireLogin, (req, res) => {
  const groupId = req.params.groupId;
  
  const groupsData = readJSON('data/groups.json');
  const groupIndex = groupsData.groups.findIndex(g => g.id === groupId);
  
  if (groupIndex === -1) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  const group = groupsData.groups[groupIndex];
  
  // Hapus user dari members dan admins
  group.members = group.members.filter(id => id !== req.session.userId);
  group.admins = group.admins.filter(id => id !== req.session.userId);
  
  groupsData.groups[groupIndex] = group;
  writeJSON('data/groups.json', groupsData);
  
  res.json({ success: true });
});

// ==================== END GROUP API ROUTES ====================

// Add comment with media
app.post('/api/post/:postId/comment', requireLogin, (req, res) => {
  const postId = req.params.postId;
  const { text, mediaUrl, mediaType } = req.body;
  
  if (!text && !mediaUrl) {
    return res.status(400).json({ error: 'Komentar tidak boleh kosong' });
  }
  
  const database = readJSON('data/database.json');
  const postIndex = database.posts.findIndex(p => p.id === postId);
  if (postIndex === -1) return res.status(404).json({ error: 'Post not found' });
  
  const commentId = 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const newComment = {
    id: commentId,
    postId,
    userId: req.session.userId,
    username: req.session.username,
    text: text || '',
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || null,
    profilePic: getUserById(req.session.userId)?.profilePic || '',
    isVerified: isVerified(req.session.userId),
    createdAt: new Date().toISOString()
  };
  
  if (!database.comments) database.comments = [];
  database.comments.push(newComment);
  
  if (!database.posts[postIndex].comments) database.posts[postIndex].comments = [];
  database.posts[postIndex].comments.push(commentId);
  
  writeJSON('data/database.json', database);
  
  res.json({ success: true, comment: newComment });
});

// Get comments for a post
app.get('/api/post/:postId/comments', requireLogin, (req, res) => {
  const postId = req.params.postId;
  const database = readJSON('data/database.json');
  
  const comments = (database.comments || [])
    .filter(c => c.postId === postId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ comments });
});

// Get feed (semua post)
app.get('/api/feed', requireLogin, (req, res) => {
  const database = readJSON('data/database.json');
  const followData = readJSON('data/follow.data.json');
  const following = followData.following[req.session.userId] || [];
  
  // Ambil semua post
  const allPosts = database.posts || [];
  
  // Sort by date (newest first)
  const sortedPosts = allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Map dengan informasi tambahan
  const posts = sortedPosts.map(post => ({
    ...post,
    likesCount: post.likes ? post.likes.length : 0,
    commentsCount: post.comments ? post.comments.length : 0,
    isLiked: post.likes ? post.likes.includes(req.session.userId) : false,
    isFromFollowing: following.includes(post.userId) || post.userId === req.session.userId,
    userProfilePic: getUserById(post.userId)?.profilePic || '',
    isVerified: isVerified(post.userId)
  }));
  
  res.json({ posts });
});

// Get user posts
app.get('/api/user/:userId/posts', requireLogin, (req, res) => {
  const targetId = req.params.userId;
  const database = readJSON('data/database.json');
  
  const posts = (database.posts || [])
    .filter(post => post.userId === targetId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(post => ({
      ...post,
      likesCount: post.likes ? post.likes.length : 0,
      commentsCount: post.comments ? post.comments.length : 0,
      isLiked: post.likes ? post.likes.includes(req.session.userId) : false,
      isVerified: isVerified(targetId)
    }));
  
  res.json({ posts });
});

// Like/unlike post
app.post('/api/post/:postId/like', requireLogin, (req, res) => {
  const postId = req.params.postId;
  const database = readJSON('data/database.json');
  
  const postIndex = database.posts.findIndex(p => p.id === postId);
  if (postIndex === -1) return res.status(404).json({ error: 'Post not found' });
  
  const post = database.posts[postIndex];
  if (!post.likes) post.likes = [];
  
  const likeIndex = post.likes.indexOf(req.session.userId);
  let liked = false;
  
  if (likeIndex === -1) {
    post.likes.push(req.session.userId);
    liked = true;
  } else {
    post.likes.splice(likeIndex, 1);
    liked = false;
  }
  
  database.posts[postIndex] = post;
  writeJSON('data/database.json', database);
  
  res.json({ 
    success: true, 
    liked, 
    likesCount: post.likes.length 
  });
});

// Search users
app.get('/api/search', requireLogin, (req, res) => {
  const query = req.query.q?.toLowerCase() || '';
  if (!query) return res.json({ users: [] });
  
  const userData = readJSON('data/user.json');
  const users = Object.values(userData)
    .filter(user => user.username.toLowerCase().includes(query))
    .map(user => ({
      id: user.id,
      username: user.username,
      profilePic: user.profilePic,
      bio: user.bio,
      isVerified: isVerified(user.id)
    }))
    .slice(0, 20);
  
  res.json({ users });
});

// Follow/unfollow user
app.post('/api/user/:userId/follow', requireLogin, (req, res) => {
  const targetId = req.params.userId;
  if (targetId === req.session.userId) {
    return res.status(400).json({ error: 'Tidak bisa follow diri sendiri' });
  }
  
  const result = toggleFollow(req.session.userId, targetId);
  res.json(result);
});

// Get follow status
app.get('/api/user/:userId/follow-status', requireLogin, (req, res) => {
  const targetId = req.params.userId;
  const status = getFollowStatus(req.session.userId, targetId);
  res.json(status);
});

// Get followers list
app.get('/api/user/:userId/followers', requireLogin, (req, res) => {
  const targetId = req.params.userId;
  const followData = readJSON('data/follow.data.json');
  const userData = readJSON('data/user.json');
  
  const followers = (followData.followers[targetId] || []).map(followerId => ({
    id: followerId,
    username: userData[followerId]?.username || 'Unknown',
    profilePic: userData[followerId]?.profilePic || '',
    isVerified: isVerified(followerId),
    isFollowing: followData.following[req.session.userId]?.includes(followerId) || false
  }));
  
  res.json({ followers });
});

// Get following list
app.get('/api/user/:userId/following', requireLogin, (req, res) => {
  const targetId = req.params.userId;
  const followData = readJSON('data/follow.data.json');
  const userData = readJSON('data/user.json');
  
  const following = (followData.following[targetId] || []).map(followingId => ({
    id: followingId,
    username: userData[followingId]?.username || 'Unknown',
    profilePic: userData[followingId]?.profilePic || '',
    isVerified: isVerified(followingId),
    isFollowing: followData.following[req.session.userId]?.includes(followingId) || false
  }));
  
  res.json({ following });
});

// Get all posts for explore
app.get('/api/explore', requireLogin, (req, res) => {
  const database = readJSON('data/database.json');
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const startIndex = (page - 1) * limit;
  
  const posts = (database.posts || [])
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(startIndex, startIndex + limit)
    .map(post => ({
      ...post,
      likesCount: post.likes ? post.likes.length : 0,
      commentsCount: post.comments ? post.comments.length : 0,
      isLiked: post.likes ? post.likes.includes(req.session.userId) : false,
      isVerified: isVerified(post.userId)
    }));
  
  res.json({ 
    posts,
    hasMore: startIndex + limit < (database.posts || []).length
  });
});

// Get trending posts
app.get('/api/trending', requireLogin, (req, res) => {
  const database = readJSON('data/database.json');
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const posts = (database.posts || [])
    .filter(post => new Date(post.createdAt) > oneWeekAgo)
    .map(post => ({
      ...post,
      likesCount: post.likes ? post.likes.length : 0,
      commentsCount: post.comments ? post.comments.length : 0,
      isLiked: post.likes ? post.likes.includes(req.session.userId) : false,
      isVerified: isVerified(post.userId)
    }))
    .sort((a, b) => b.likesCount - a.likesCount)
    .slice(0, 20);
  
  res.json({ posts });
});

// ==================== MESSAGES ROUTES ====================

// Get conversations
app.get('/api/messages/conversations', requireLogin, (req, res) => {
  const conversations = getUserConversations(req.session.userId);
  res.json({ conversations });
});

// Get messages in a conversation
app.get('/api/messages/:conversationId', requireLogin, (req, res) => {
  const conversationId = req.params.conversationId;
  const messagesData = readJSON('data/messages.json');
  const userData = readJSON('data/user.json');
  
  if (!messagesData.conversations[conversationId]) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const conversation = messagesData.conversations[conversationId];
  if (!conversation.participants.includes(req.session.userId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Mark messages as read
  markMessagesAsRead(conversationId, req.session.userId);
  
  const messages = conversation.messages.map(msg => ({
    ...msg,
    isOwn: msg.senderId === req.session.userId,
    sender: {
      id: msg.senderId,
      username: userData[msg.senderId]?.username || 'Unknown',
      profilePic: userData[msg.senderId]?.profilePic || '',
      isVerified: isVerified(msg.senderId)
    }
  }));
  
  res.json({ messages });
});

// Send message
app.post('/api/messages/send', requireLogin, (req, res) => {
  const { receiverId, text, mediaUrl, mediaType } = req.body;
  
  console.log('Send message request:', { receiverId, text, mediaUrl, mediaType });
  
  if (!receiverId) {
    return res.status(400).json({ error: 'Receiver ID required' });
  }
  
  const receiver = getUserById(receiverId);
  if (!receiver) {
    return res.status(404).json({ error: 'Receiver not found' });
  }
  
  const newMessage = saveMessage(req.session.userId, receiverId, text, mediaUrl, mediaType);
  
  res.json({ 
    success: true, 
    message: {
      ...newMessage,
      isOwn: true
    }
  });
});

// Mark messages as read
app.post('/api/messages/:conversationId/read', requireLogin, (req, res) => {
  const conversationId = req.params.conversationId;
  const success = markMessagesAsRead(conversationId, req.session.userId);
  res.json({ success });
});

// Get unread count
app.get('/api/messages/unread/count', requireLogin, (req, res) => {
  const messagesData = readJSON('data/messages.json');
  let totalUnread = 0;
  
  Object.values(messagesData.conversations || {}).forEach(conv => {
    if (conv.participants.includes(req.session.userId)) {
      totalUnread += conv.unreadCount?.[req.session.userId] || 0;
    }
  });
  
  res.json({ unreadCount: totalUnread });
});

// ==================== ADMIN ROUTES ====================

// Get all users (admin only)
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const userData = readJSON('data/user.json');
  const loginData = readJSON('data/login.json');
  const verifiedData = readJSON('data/verified.users.json');
  
  const users = Object.values(userData).map(user => ({
    id: user.id,
    username: user.username,
    profilePic: user.profilePic,
    bio: user.bio,
    posts: user.posts || 0,
    followers: user.followers || 0,
    following: user.following || 0,
    isVerified: verifiedData.verified?.includes(user.id) || false,
    isAdmin: isAdmin(user.id),
    createdAt: user.createdAt
  }));
  
  res.json({ users });
});

// Get all posts (admin only)
app.get('/api/admin/posts', requireAdmin, (req, res) => {
  const database = readJSON('data/database.json');
  const userData = readJSON('data/user.json');
  
  const posts = (database.posts || []).map(post => ({
    ...post,
    username: userData[post.userId]?.username || 'Unknown',
    userProfilePic: userData[post.userId]?.profilePic || '',
    likesCount: post.likes ? post.likes.length : 0,
    commentsCount: post.comments ? post.comments.length : 0,
    isVerified: isVerified(post.userId),
    mediaCount: post.mediaArray ? post.mediaArray.length : 1
  })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ posts });
});

// Get admin stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const userData = readJSON('data/user.json');
  const database = readJSON('data/database.json');
  const loginData = readJSON('data/login.json');
  const verifiedData = readJSON('data/verified.users.json');
  const groupsData = readJSON('data/groups.json');
  
  let totalMedia = 0;
  let totalMusic = 0;
  
  database.posts?.forEach(post => {
    if (post.mediaArray) {
      totalMedia += post.mediaArray.length;
    } else {
      totalMedia += 1;
    }
    if (post.musicUrl) totalMusic++;
  });
  
  const stats = {
    totalUsers: Object.keys(userData).length,
    totalPosts: (database.posts || []).length,
    totalComments: database.comments?.length || 0,
    totalAdmins: loginData.adminUsers?.length || 0,
    totalVerified: verifiedData.verified?.length || 0,
    totalImages: (database.posts || []).filter(p => p.mediaType === 'image').length,
    totalVideos: (database.posts || []).filter(p => p.mediaType === 'video').length,
    totalMedia: totalMedia,
    totalMusic: totalMusic,
    totalGroups: groupsData.groups?.length || 0
  };
  
  res.json({ stats });
});

// Verify user (admin only)
app.post('/api/admin/verify/:userId', requireAdmin, (req, res) => {
  const targetId = req.params.userId;
  const verifiedData = readJSON('data/verified.users.json');
  
  if (!verifiedData.verified) verifiedData.verified = [];
  
  if (!verifiedData.verified.includes(targetId)) {
    verifiedData.verified.push(targetId);
    writeJSON('data/verified.users.json', verifiedData);
    return res.json({ success: true, verified: true });
  }
  
  res.json({ success: true, verified: true });
});

// Unverify user (admin only)
app.post('/api/admin/unverify/:userId', requireAdmin, (req, res) => {
  const targetId = req.params.userId;
  const verifiedData = readJSON('data/verified.users.json');
  
  if (verifiedData.verified) {
    verifiedData.verified = verifiedData.verified.filter(id => id !== targetId);
    writeJSON('data/verified.users.json', verifiedData);
  }
  
  res.json({ success: true, verified: false });
});

// Make admin (admin only)
app.post('/api/admin/make-admin/:userId', requireAdmin, (req, res) => {
  const targetId = req.params.userId;
  const loginData = readJSON('data/login.json');
  
  if (!loginData.adminUsers) loginData.adminUsers = [];
  
  if (!loginData.adminUsers.includes(targetId)) {
    loginData.adminUsers.push(targetId);
    writeJSON('data/login.json', loginData);
  }
  
  res.json({ success: true, isAdmin: true });
});

// Remove admin (admin only)
app.post('/api/admin/remove-admin/:userId', requireAdmin, (req, res) => {
  const targetId = req.params.userId;
  const loginData = readJSON('data/login.json');
  
  if (loginData.adminUsers) {
    loginData.adminUsers = loginData.adminUsers.filter(id => id !== targetId);
    writeJSON('data/login.json', loginData);
  }
  
  res.json({ success: true, isAdmin: false });
});

// Delete post (admin only)
app.delete('/api/admin/post/:postId', requireAdmin, (req, res) => {
  const postId = req.params.postId;
  const database = readJSON('data/database.json');
  
  const postIndex = database.posts.findIndex(p => p.id === postId);
  if (postIndex === -1) return res.status(404).json({ error: 'Post not found' });
  
  const post = database.posts[postIndex];
  
  // Hapus dari database
  database.posts.splice(postIndex, 1);
  
  // Hapus komentar terkait
  if (database.comments) {
    database.comments = database.comments.filter(c => c.postId !== postId);
  }
  
  writeJSON('data/database.json', database);
  
  // Kurangi post count user
  const userData = readJSON('data/user.json');
  if (userData[post.userId]) {
    userData[post.userId].posts = Math.max(0, (userData[post.userId].posts || 0) - 1);
    writeJSON('data/user.json', userData);
  }
  
  res.json({ success: true });
});

// ==================== NOTIFICATION ROUTES ====================

// Get notifications
app.get('/api/notifications', requireLogin, (req, res) => {
  const database = readJSON('data/database.json');
  const userData = readJSON('data/user.json');
  const notifications = [];
  
  // Get recent likes on user's posts
  (database.posts || []).forEach(post => {
    if (post.userId === req.session.userId && post.likes && post.likes.length > 0) {
      post.likes.forEach(likeUserId => {
        if (likeUserId !== req.session.userId) {
          notifications.push({
            id: `like_${post.id}_${likeUserId}`,
            type: 'like',
            userId: likeUserId,
            username: userData[likeUserId]?.username || 'Unknown',
            profilePic: userData[likeUserId]?.profilePic || '',
            isVerified: isVerified(likeUserId),
            postId: post.id,
            postMedia: post.mediaUrl,
            createdAt: post.createdAt,
            read: false
          });
        }
      });
    }
    
    // Get recent comments on user's posts
    if (post.userId === req.session.userId && post.comments && post.comments.length > 0) {
      database.comments?.forEach(comment => {
        if (comment.postId === post.id && comment.userId !== req.session.userId) {
          notifications.push({
            id: `comment_${comment.id}`,
            type: 'comment',
            userId: comment.userId,
            username: comment.username,
            profilePic: comment.profilePic || '',
            isVerified: isVerified(comment.userId),
            postId: post.id,
            postMedia: post.mediaUrl,
            comment: comment.text,
            createdAt: comment.createdAt,
            read: false
          });
        }
      });
    }
  });
  
  // Sort by date (newest first) and limit
  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ notifications: notifications.slice(0, 50) });
});

// ==================== SETTINGS ROUTES ====================

// Change password
app.post('/api/settings/change-password', requireLogin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password required' });
  }
  
  const loginData = readJSON('data/login.json');
  const userIndex = loginData.users.findIndex(u => u.id === req.session.userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const valid = await bcrypt.compare(currentPassword, loginData.users[userIndex].password);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  loginData.users[userIndex].password = hashedPassword;
  writeJSON('data/login.json', loginData);
  
  res.json({ success: true });
});

// Delete account
app.delete('/api/settings/delete-account', requireLogin, async (req, res) => {
  const userId = req.session.userId;
  
  // Hapus dari login.json
  const loginData = readJSON('data/login.json');
  loginData.users = loginData.users.filter(u => u.id !== userId);
  loginData.adminUsers = (loginData.adminUsers || []).filter(id => id !== userId);
  writeJSON('data/login.json', loginData);
  
  // Hapus dari user.json
  const userData = readJSON('data/user.json');
  delete userData[userId];
  writeJSON('data/user.json', userData);
  
  // Hapus dari verified
  const verifiedData = readJSON('data/verified.users.json');
  verifiedData.verified = (verifiedData.verified || []).filter(id => id !== userId);
  writeJSON('data/verified.users.json', verifiedData);
  
  // Hapus posts user
  const database = readJSON('data/database.json');
  database.posts = (database.posts || []).filter(p => p.userId !== userId);
  database.comments = (database.comments || []).filter(c => c.userId !== userId);
  writeJSON('data/database.json', database);
  
  // Hapus dari follow data
  const followData = readJSON('data/follow.data.json');
  delete followData.followers[userId];
  delete followData.following[userId];
  Object.keys(followData.followers || {}).forEach(key => {
    followData.followers[key] = followData.followers[key].filter(id => id !== userId);
  });
  Object.keys(followData.following || {}).forEach(key => {
    followData.following[key] = followData.following[key].filter(id => id !== userId);
  });
  writeJSON('data/follow.data.json', followData);
  
  // Hapus remember tokens
  const savedData = readJSON('data/saved.login.json');
  if (savedData.rememberTokens) {
    Object.keys(savedData.rememberTokens).forEach(token => {
      if (savedData.rememberTokens[token].userId === userId) {
        delete savedData.rememberTokens[token];
      }
    });
    writeJSON('data/saved.login.json', savedData);
  }
  
  // Hapus dari messages personal
  const messagesData = readJSON('data/messages.json');
  if (messagesData.conversations) {
    Object.keys(messagesData.conversations).forEach(convId => {
      if (messagesData.conversations[convId].participants.includes(userId)) {
        delete messagesData.conversations[convId];
      }
    });
    messagesData.lastMessages = (messagesData.lastMessages || []).filter(msg => !msg.participants.includes(userId));
    writeJSON('data/messages.json', messagesData);
  }
  
  // Hapus dari grup
  const groupsData = readJSON('data/groups.json');
  if (groupsData.groups) {
    // Hapus user dari semua grup
    groupsData.groups.forEach(group => {
      group.members = group.members.filter(id => id !== userId);
      group.admins = group.admins.filter(id => id !== userId);
    });
    // Hapus grup yang tidak punya anggota
    groupsData.groups = groupsData.groups.filter(group => group.members.length > 0);
    writeJSON('data/groups.json', groupsData);
  }
  
  // Logout
  req.session.destroy();
  res.clearCookie('connect.sid');
  res.clearCookie('rememberToken');
  
  res.json({ success: true });
});

// ==================== SERVER START ====================
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
  console.log(`📁 Folder uploads: ${path.resolve('./uploads')}`);
  console.log(`📁 Folder data: ${path.resolve('./data')}`);
  console.log(`📁 Folder comments: ${path.resolve('./uploads/comments')}`);
  console.log(`📁 Folder music: ${path.resolve('./uploads/music')}`);
  console.log(`📁 Folder chat: ${path.resolve('./uploads/chat')}`);
  console.log(`📁 Folder groups: ${path.resolve('./uploads/groups')}`);
  console.log(`🌐 Mode: ${process.env.NODE_ENV || 'development'}`);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: err.message || 'Terjadi kesalahan server' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

module.exports = app;
