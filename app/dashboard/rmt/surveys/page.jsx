import React from "react";
import { getAllSurveys } from "@/app/_actions";

const surveyPage = async () => {
  const surveys = await getAllSurveys();
  console.log(surveys);

  const comments = surveys.map((survey) => ({
    email: survey.email,
    comment: survey.comments,
  }));

  const responses = surveys.reduce(
    (acc, survey) => {
      // onlineBooking
      if (survey.onlineBooking) {
        acc.onlineBooking[survey.onlineBooking].push(survey.email);
      }

      // stretchClasses
      if (survey.stretchClasses) {
        acc.stretchClasses[survey.stretchClasses].push(survey.email);
      }

      // workplaceMassage
      if (survey.workplaceMassage) {
        acc.workplaceMassage[survey.workplaceMassage].push(survey.email);
      }

      // rateIncrease
      if (survey.rateIncrease) {
        acc.rateIncrease[survey.rateIncrease].push(survey.email);
      }

      return acc;
    },
    {
      onlineBooking: { yes: [], no: [], indifferent: [] },
      stretchClasses: { yes: [], no: [] },
      workplaceMassage: { yes: [], no: [] },
      rateIncrease: { noChange: [], noLongerCome: [], lessOften: [] },
    }
  );

  return (
    <div>
      <h1>Survey Responses</h1>
      <h2>Online Booking</h2>
      <table className="table-auto border-collapse border-2 border-gray-500">
        <thead>
          <tr>
            <th className="border-2 border-gray-400 px-4 py-2 text-gray-800">
              Response
            </th>
            <th className="border-2 border-gray-400 px-4 py-2 text-gray-800">
              Emails
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(responses.onlineBooking).map(([response, emails]) => (
            <tr key={response}>
              <td className="border-2 border-gray-400 px-4 py-2">{response}</td>
              <td className="border-2 border-gray-400 px-4 py-2">
                {emails.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>stretchClasses</h2>
      <table className="table-auto border-collapse border-2 border-gray-500">
        <thead>
          <tr>
            <th className="border-2 border-gray-400 px-4 py-2 text-gray-800">
              Response
            </th>
            <th className="border-2 border-gray-400 px-4 py-2 text-gray-800">
              Emails
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(responses.stretchClasses).map(
            ([response, emails]) => (
              <tr key={response}>
                <td className="border-2 border-gray-400 px-4 py-2">
                  {response}
                </td>
                <td className="border-2 border-gray-400 px-4 py-2">
                  {emails.join(", ")}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
      <h2>workplace Massage</h2>
      <table className="table-auto border-collapse border-2 border-gray-500">
        <thead>
          <tr>
            <th className="border-2 border-gray-400 px-4 py-2 text-gray-800">
              Response
            </th>
            <th className="border-2 border-gray-400 px-4 py-2 text-gray-800">
              Emails
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(responses.workplaceMassage).map(
            ([response, emails]) => (
              <tr key={response}>
                <td className="border-2 border-gray-400 px-4 py-2">
                  {response}
                </td>
                <td className="border-2 border-gray-400 px-4 py-2">
                  {emails.join(", ")}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
      <h2>rate increase</h2>
      <table className="table-auto border-collapse border-2 border-gray-500">
        <thead>
          <tr>
            <th className="border-2 border-gray-400 px-4 py-2 text-gray-800">
              Response
            </th>
            <th className="border-2 border-gray-400 px-4 py-2 text-gray-800">
              Emails
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(responses.rateIncrease).map(([response, emails]) => (
            <tr key={response}>
              <td className="border-2 border-gray-400 px-4 py-2">{response}</td>
              <td className="border-2 border-gray-400 px-4 py-2">
                {emails.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <h2>Comments</h2>
        <table className="table-auto border-collapse border-2 border-gray-500">
          <thead>
            <tr>
              <th className="border-2 border-gray-400 px-4 py-2 text-gray-800">
                Email
              </th>
              <th className="border-2 border-gray-400 px-4 py-2 text-gray-800">
                Comment
              </th>
            </tr>
          </thead>
          <tbody>
            {comments.map(({ email, comment }) => (
              <tr key={email}>
                <td className="border-2 border-gray-400 px-4 py-2">{email}</td>
                <td className="border-2 border-gray-400 px-4 py-2">
                  {comment}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default surveyPage;
