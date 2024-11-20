// Define enum for status
export const statusEnum = {
    PENDING: "Pending",
    SOLVED: "Solved",
};

// Define enum for query options
// export const queryOptionsEnum = {
//     PRICING_QUERY: "Pricing Query",
//     PARTNERSHIP_INQUIRIES: "Partnership inquiries",
//     AFFILIATE_PROGRAM: "Affiliate program",
//     INTEGRATION_PARTNERSHIP: "Integration Partnership",
//     BOOK_A_DEMO: "Book a demo",
//     OTHERS: "Others",
// };

export const queryOptionsEnum = {"Pricing Query":"Pricing Query", "Partnership issues":"Partnership issues", "Affiliate program":"Affiliate program", "Integration partnership":"Integration partnership", "Book a demo":"Book a demo", "Others":"Others"}


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


export function getDateDifference(inputDate) {
    const currentDate = new Date(); // Current date
    const givenDate = new Date(inputDate); // Convert input to Date object
  
    // Calculate the difference in milliseconds
    const differenceInMilliseconds = currentDate - givenDate;
  
    // Convert milliseconds to days
    const differenceInDays = Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));

    if(differenceInDays >90){

        return false;
    }
  
    return true;
}
  
  
// /user_data`

export const allCompaniesEndpoint = [

    `${process.env.base_company_url}/user_data`,
    // `${process.env.base_company_url}/generate_token`,
    `${process.env.dummyBackendCompanyUrl}/email`,

];


