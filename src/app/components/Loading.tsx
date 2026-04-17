import React from "react";
import ClipLoader from "react-spinners/ClipLoader";

export default function Loading() {
  return (
    <>
      <div className="flex items-center justify-center h-screen">
        <ClipLoader color={"#36D7B7"} size={100} />
      </div>
    </>
  );
}
