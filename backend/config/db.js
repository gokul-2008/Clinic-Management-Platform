import mongoose from 'mongoose';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Auto-seed default accounts for role testing
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Seeding default role-based accounts...');
      
      // Seed default Doctor document
      const seededDoctor = await Doctor.create({
        name: 'Stephen Strange',
        specialty: 'Cardiology',
        phone: '123-456-7890',
        consultationFee: 150,
        availability: [
          { day: 'Monday', hours: '09:00 AM - 05:00 PM' },
          { day: 'Wednesday', hours: '09:00 AM - 05:00 PM' },
          { day: 'Friday', hours: '09:00 AM - 05:00 PM' }
        ]
      });

      await User.create([
        { email: 'admin@carepulse.com', password: 'admin123', role: 'Admin' },
        { email: 'doctor@carepulse.com', password: 'doctor123', role: 'Doctor', associatedId: seededDoctor._id },
        { email: 'staff@carepulse.com', password: 'staff123', role: 'Receptionist' }
      ]);
      console.log('Seeded testing credentials:');
      console.log('  Admin: admin@carepulse.com / admin123');
      console.log('  Doctor: doctor@carepulse.com / doctor123');
      console.log('  Receptionist: staff@carepulse.com / staff123');
    } else {
      // Ensure existing doctor user is associated with a Doctor profile
      const doctorUser = await User.findOne({ email: 'doctor@carepulse.com' });
      if (doctorUser && !doctorUser.associatedId) {
        let docProfile = await Doctor.findOne({ name: 'Stephen Strange' });
        if (!docProfile) {
          docProfile = await Doctor.create({
            name: 'Stephen Strange',
            specialty: 'Cardiology',
            phone: '123-456-7890',
            consultationFee: 150,
            availability: [
              { day: 'Monday', hours: '09:00 AM - 05:00 PM' },
              { day: 'Wednesday', hours: '09:00 AM - 05:00 PM' },
              { day: 'Friday', hours: '09:00 AM - 05:00 PM' }
            ]
          });
        }
        doctorUser.associatedId = docProfile._id;
        await doctorUser.save();
        console.log('Linked doctor user with Dr. Stephen Strange profile.');
      }
    }

    // Migrate existing patients to have sequential patientId if they lack one
    const Patient = mongoose.model('Patient');
    const patientsToMigrate = await Patient.find({ 
      $or: [
        { patientId: { $exists: false } },
        { patientId: null }
      ]
    }).sort({ createdAt: 1 });
    
    if (patientsToMigrate.length > 0) {
      console.log(`Migrating ${patientsToMigrate.length} patients to assign sequential Patient IDs...`);
      for (const patient of patientsToMigrate) {
        const lastPatient = await Patient.findOne(
          { patientId: { $regex: /^PAT-\d+$/ } },
          {},
          { sort: { patientId: -1 } }
        );
        let nextSeq = 1;
        if (lastPatient && lastPatient.patientId) {
          const match = lastPatient.patientId.match(/PAT-(\d+)/);
          if (match) {
            nextSeq = parseInt(match[1], 10) + 1;
          }
        }
        const paddedSeq = String(nextSeq).padStart(4, '0');
        patient.patientId = `PAT-${paddedSeq}`;
        await patient.save();
      }
      console.log('Patient ID migration completed.');
    }

  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
