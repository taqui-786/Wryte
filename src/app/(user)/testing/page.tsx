import React from 'react'
import TestingEditor from './components/TestingEditor'
// @ts-ignore
import "./components/myEditor.css"
function page() {
  return (
    <div className="h-full flex items-center justify-center ">
      <TestingEditor/>
    </div>
  )
}

export default page