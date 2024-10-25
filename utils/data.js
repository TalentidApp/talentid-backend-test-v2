// Define enum for status
export const statusEnum = {
    PENDING: "Pending",
    SOLVED: "Solved",
};

// Define enum for query options
export const queryOptionsEnum = {
    PRICING_QUERY: "Pricing Query",
    PARTNERSHIP_INQUIRIES: "Partnership inquiries",
    AFFILIATE_PROGRAM: "Affiliate program",
    INTEGRATION_PARTNERSHIP: "Integration Partnership",
    BOOK_A_DEMO: "Book a demo",
    OTHERS: "Others",
};


import { v4 as uuidv4 } from 'uuid';

export const emailType = {

    verify: "Verfiy",
    resetPassword: "Reset Password",

}


export const paymentStatusEnum = {

    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    USER_DROPPED: 'USER_DROPPED',
    FAILED: 'FAILED'
};



export const randomStringGenerator = (length) => {

    return uuidv4().replace(/-/g, '').slice(0, length);
  
};

export function generateResetPasswordToken() {
    const token = randomStringGenerator(6) // Generate a random token
    const tokenExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    return { token, tokenExpires };
}

