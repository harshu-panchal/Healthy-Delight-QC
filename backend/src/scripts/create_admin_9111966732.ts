import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/Admin';

dotenv.config();

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI missing');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const mobile = '9111966732';

    // Check if admin already exists with this mobile
    let admin = await Admin.findOne({ mobile });

    if (admin) {
      console.log(`Admin already exists with mobile ${mobile}`);
      console.log({
        id: admin._id.toString(),
        mobile: admin.mobile,
        email: admin.email,
        role: admin.role,
      });
    } else {
      const email = 'admin9111966732@kosil.com';

      admin = await Admin.create({
        firstName: 'Harsh',
        lastName: 'Admin',
        mobile,
        email,
        password: 'Admin@123',
        role: 'Super Admin',
      });

      console.log('Admin created successfully:');
      console.log({
        id: admin._id.toString(),
        mobile: admin.mobile,
        email: admin.email,
        role: admin.role,
      });
    }
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();

