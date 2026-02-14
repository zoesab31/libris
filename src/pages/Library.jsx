import React from "react";
import MyLibrary from "./MyLibrary";

// Library page container - currently wraps MyLibrary
// Will be refactored to include tabbed navigation for Books/Shelves/Stats/3D
export default function Library() {
  return (
    <div className="p-6">
      <p className="text-center text-sm text-gray-500">Choisissez une section ci-dessous.</p>
    </div>
  );
}