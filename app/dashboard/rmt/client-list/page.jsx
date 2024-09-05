import React from "react";
import { getAllUsers } from "@/app/_actions";

const clientListPage = async () => {
  const users = await getAllUsers();

  return (
    <div>
      <h1>Client List</h1>
      <h2>Users:</h2>
      <p>Number of users: {users.length}</p> {/* Display number of users */}
      <ul>
        {users.map((user) => (
          <li key={user._id}>{user.email},</li>
        ))}
      </ul>
    </div>
  );
};

export default clientListPage;
