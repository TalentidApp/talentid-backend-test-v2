import jwt from 'jsonwebtoken';

export const generateTokenAndSetCookie = async(userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '15d',
  });

  // Set token in an HTTP-only cookie
  // res.cookie('jwt', token, {
  //   // httpOnly: true, // more secure
  //   maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
  //   sameSite: 'strict', // prevent CSRF
  // });

  res.cookie('token', token, {
    expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
    // Omit other attributes for testing
  });

  
  return token;
  
};



