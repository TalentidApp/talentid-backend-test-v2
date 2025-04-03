// models/notification.model.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    required: true 
  },
  emailEnabled: { 
    type: Boolean, 
    default: false 
  },
  emailSent: { 
    type: Boolean, 
    default: false 
  },
  metadata: { 
    type: Map, 
    of: String 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  received: { 
    type: Boolean, 
    default: false 
  },
}, { 
  timestamps: true 
});

export default mongoose.model('Notification', notificationSchema);