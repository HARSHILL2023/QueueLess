const request = require('supertest');
const { io: ioClient } = require('socket.io-client');
const { app, server, io } = require('../src/server');
const Hospital = require('../src/models/Hospital');
const Department = require('../src/models/Department');
const User = require('../src/models/User');

const waitForEvent = (socket, event, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for "${event}"`));
    }, timeoutMs);

    const handler = (payload) => {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };

    socket.on(event, handler);
  });

const waitForConnect = (socket, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    if (socket.connected) return resolve();

    const timer = setTimeout(() => reject(new Error('Timed out connecting socket')), timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const waitForConnectError = (socket, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for connect_error')), timeoutMs);
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      resolve(error);
    });
    socket.once('connect', () => {
      clearTimeout(timer);
      reject(new Error('Socket connected when it should have been rejected'));
    });
  });

const roomMembers = (room) => {
  const members = io.sockets.adapter.rooms.get(room);
  return members ? [...members] : [];
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Socket.IO audit: authentication, room authorization and live delivery', () => {
  let baseUrl;
  let hospital;
  let otherHospital;
  let department;
  let otherDepartment;
  let staffToken;
  let staffId;
  let patientToken;
  let patientId;
  let patientEmail;
  const clients = [];

  const connect = (auth) => {
    const socket = ioClient(baseUrl, {
      auth,
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    clients.push(socket);
    return socket;
  };

  beforeAll(async () => {
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    hospital = await Hospital.create({
      name: 'Socket General Hospital',
      code: `SOK${suffix.slice(-6)}`,
      address: { city: 'Socket City', state: 'Socket State' },
      phone: '1234567890',
      email: 'socket@hospital.test',
      isVerified: true,
      status: 'active',
    });
    otherHospital = await Hospital.create({
      name: 'Socket Other Hospital',
      code: `SOO${suffix.slice(-6)}`,
      address: { city: 'Other City', state: 'Other State' },
      phone: '1234567891',
      email: 'other@hospital.test',
      isVerified: true,
      status: 'active',
    });

    department = await Department.create({
      hospitalId: hospital._id,
      name: 'Socket Cardiology',
      code: 'SOKC',
      isActive: true,
    });
    otherDepartment = await Department.create({
      hospitalId: otherHospital._id,
      name: 'Other Cardiology',
      code: 'SOOC',
      isActive: true,
    });

    const staff = await User.create({
      name: 'Socket Staff',
      email: `socket_staff_${suffix}@hospital.test`,
      password: 'Password123!',
      role: 'staff',
      staffRole: 'doctor',
      hospitalId: hospital._id,
      departmentId: department._id,
    });
    staffId = staff._id.toString();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: staff.email, password: 'Password123!' });
    expect(login.statusCode).toBe(200);
    staffToken = login.body.data.token;

    patientEmail = `socket_patient_${suffix}@hospital.test`;
    const patientReg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Socket Patient', email: patientEmail, password: 'Password123!' });
    expect(patientReg.statusCode).toBe(201);
    patientToken = patientReg.body.data.token;
    patientId = patientReg.body.data.user._id;
  }, 60000);

  afterAll(async () => {
    clients.forEach((socket) => socket.disconnect());
    if (server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  }, 60000);

  it('rejects a socket connection without a JWT', async () => {
    const socket = connect({});
    const error = await waitForConnectError(socket);

    expect(error.message).toContain('Authentication required');
    expect(roomMembers(`user_${patientId}`)).not.toContain(socket.id);
  });

  it('rejects a socket connection with an invalid JWT', async () => {
    const socket = connect({ token: 'not-a-real-token' });
    const error = await waitForConnectError(socket);

    expect(error.message).toContain('Invalid token');
  });

  it('lets hospital staff join their own department room and receive live queue events', async () => {
    const staffSocket = connect({ token: staffToken });
    await waitForConnect(staffSocket);

    staffSocket.emit('join_department', department._id.toString());
    await delay(200);

    expect(roomMembers(`department_${department._id}`)).toContain(staffSocket.id);

    const queueUpdate = waitForEvent(staffSocket, 'queue_updated');
    const patientSocket = connect({ token: patientToken });
    await waitForConnect(patientSocket);
    patientSocket.emit('join_user', patientId);
    await delay(150);

    const tokenCreated = waitForEvent(patientSocket, 'token_status_changed');

    const booking = await request(app)
      .post('/api/queue/token')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ hospitalId: hospital._id.toString(), departmentId: department._id.toString() });

    expect(booking.statusCode).toBe(201);

    const staffEvent = await queueUpdate;
    expect(staffEvent.type).toBe('TOKEN_BOOKED');
    expect(staffEvent.tokenDisplay).toBe(booking.body.data.token.tokenDisplay);

    const patientEvent = await tokenCreated;
    expect(patientEvent.type).toBe('TOKEN_CREATED');
    expect(patientEvent.token._id.toString()).toBe(booking.body.data.token._id.toString());
  });

  it('blocks staff from joining another hospital department room', async () => {
    const staffSocket = connect({ token: staffToken });
    await waitForConnect(staffSocket);

    staffSocket.emit('join_department', otherDepartment._id.toString());
    await delay(200);

    expect(roomMembers(`department_${otherDepartment._id}`)).not.toContain(staffSocket.id);
  });

  it('allows a patient to join only their own user room', async () => {
    const patientSocket = connect({ token: patientToken });
    await waitForConnect(patientSocket);

    patientSocket.emit('join_user', staffId);
    patientSocket.emit('join_user', patientId);
    await delay(200);

    const ownRoom = roomMembers(`user_${patientId}`);
    const staffRoom = roomMembers(`user_${staffId}`);

    expect(ownRoom).toContain(patientSocket.id);
    expect(staffRoom).not.toContain(patientSocket.id);
  });

  it('blocks a patient from joining a department room', async () => {
    const patientSocket = connect({ token: patientToken });
    await waitForConnect(patientSocket);

    patientSocket.emit('join_department', department._id.toString());
    await delay(200);

    expect(roomMembers(`department_${department._id}`)).not.toContain(patientSocket.id);
  });
});
