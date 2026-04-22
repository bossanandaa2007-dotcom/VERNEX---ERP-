import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const complaintDbPath = path.resolve(__dirname, 'complaints.json');

const seedComplaints = [
  {
    id: 'cmp-9001',
    studentId: 's101',
    studentName: 'Arjun Kumar',
    class: '10-A',
    section: 'A',
    division: 'Boys',
    title: 'Broken classroom fan',
    description: 'The fan in our classroom is not working properly during afternoon sessions.',
    type: 'Infrastructure',
    targetId: 't1',
    targetRole: 'Teacher',
    priority: 'Medium',
    status: 'OPEN',
    createdAt: '2026-04-18T09:30:00.000Z',
  },
];

async function ensureComplaintDb() {
  try {
    await fs.access(complaintDbPath);
  } catch {
    await fs.writeFile(complaintDbPath, JSON.stringify(seedComplaints, null, 2), 'utf-8');
  }
}

async function readComplaints() {
  await ensureComplaintDb();
  const raw = await fs.readFile(complaintDbPath, 'utf-8');
  return JSON.parse(raw);
}

async function writeComplaints(complaints) {
  await fs.writeFile(complaintDbPath, JSON.stringify(complaints, null, 2), 'utf-8');
}

export async function createComplaint(complaint) {
  const complaints = await readComplaints();
  const nextComplaint = {
    ...complaint,
    id: `cmp-${Date.now()}`,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };

  complaints.unshift(nextComplaint);
  await writeComplaints(complaints);
  return nextComplaint;
}

export async function getComplaints(filters = {}) {
  const complaints = await readComplaints();

  return complaints.filter((complaint) => {
    const matchesTargetId = !filters.targetId || complaint.targetId?.toLowerCase() === filters.targetId.toLowerCase();
    const matchesStudentId = !filters.studentId || complaint.studentId?.toLowerCase() === filters.studentId.toLowerCase();
    const matchesTargetRole = !filters.targetRole || complaint.targetRole === filters.targetRole;

    return matchesTargetId && matchesStudentId && matchesTargetRole;
  });
}

export async function resolveComplaint(id, response) {
  const complaints = await readComplaints();
  const nextComplaints = complaints.map((complaint) =>
    complaint.id === id
      ? {
          ...complaint,
          status: 'RESOLVED',
          response,
          resolvedAt: new Date().toISOString(),
        }
      : complaint
  );

  const resolvedComplaint = nextComplaints.find((complaint) => complaint.id === id);

  if (!resolvedComplaint) {
    throw new Error('Complaint not found.');
  }

  await writeComplaints(nextComplaints);
  return resolvedComplaint;
}
