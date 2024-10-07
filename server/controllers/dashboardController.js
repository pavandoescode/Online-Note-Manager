require('dotenv').config();
const Note = require("../models/Notes");
const mongoose = require("mongoose");
const axios = require("axios");


exports.view = async (req, res) => {

  const note = await Note.findById({ _id: req.params.id })
console.log(note)

  if (note) {
if(note.visibility === "Public"){
    res.render("dashboard/view", {
      noteID: req.params.id,
      Domain: process.env.Domain,
      note,

    });}else{

      res.send("This Note Is Private");
    }

  } else {
    res.send("This Note Does Not Exist");
  }


}

exports.dashboard = async (req, res) => {

  let perPage = 12;
  let page = req.query.page || 1;

  const locals = {
    title: "Dashboard",
    description: "Free NodeJS Notes App.",
  };

  try {

    const notes = await Note.aggregate([
      { $sort: { updatedAt: -1 } },
      { $match: { user: mongoose.Types.ObjectId(req.user.id) } },
      {
        $project: {
          title: { $substr: ["$title", 0, 30] },
          body: { $substr: ["$body", 0, 100] },
          visibility: 1,
        },
      }
    ])
      .skip(perPage * page - perPage)
      .limit(perPage)
      .exec();

    const count = await Note.count();

    res.render('dashboard/index', {
      userName: req.user.firstName,
      locals,
      notes,
      layout: "../views/layouts/dashboard",
      current: page,
      pages: Math.ceil(count / perPage)
    });



  } catch (error) {
    console.log(error);
  }
};


exports.dashboardViewNote = async (req, res) => {
  const note = await Note.findById({ _id: req.params.id })
    .where({ user: req.user.id })
    .lean();

  if (note) {
    res.render("dashboard/view-note", {
      noteID: req.params.id,
      note,
      Domain: process.env.Domain,
      layout: "../views/layouts/dashboard",
    });
  } else {
    res.send("Something went wrong.");
  }
};

exports.summarizeNote = async (req, res) => {
  const apiKey = process.env.OpenAI_API_KEY;
  const noteContent = req.body.text;

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an assistant that summarizes text and makes key points in a concise way.' },
        { role: 'user', content: noteContent }
      ],
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });




    const summary = response.data.choices[0].message.content;


    res.json({ summary });
  } catch (error) {
    console.error('Error from OpenAI API:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error summarizing the note.' });
  }
};



exports.dashboardUpdateNote = async (req, res) => {
  try {
    await Note.findOneAndUpdate(
      { _id: req.params.id },
      { title: req.body.title, body: req.body.body, updatedAt: Date.now(), visibility: req.body.visibility }
    ).where({ user: req.user.id });
    res.redirect("/dashboard");
  } catch (error) {
    console.log(error);
  }
};



exports.dashboardDeleteNote = async (req, res) => {
  try {
    const deleted = await Note.deleteOne({ _id: req.params.id, });

    console.log(`Deleted note with ID: ${req.params.id}`);
    res.redirect("/dashboard");
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).send("An error occurred while trying to delete the note."); // Send an error response
  }
};



exports.dashboardAddNote = async (req, res) => {
  res.render("dashboard/add", {
    layout: "../views/layouts/dashboard",
  });
};




exports.dashboardAddNoteSubmit = async (req, res) => {
  try {
    req.body.user = req.user.id;
    await Note.create(req.body);

    res.redirect("/dashboard");
  } catch (error) {
    console.log(error);
  }
};



exports.dashboardSearch = async (req, res) => {
  try {
    res.render("dashboard/search", {
      searchResults: "",
      layout: "../views/layouts/dashboard",
    });
  } catch (error) { }
};



exports.dashboardSearchSubmit = async (req, res) => {
  try {
    let searchTerm = req.body.searchTerm;
    const searchNoSpecialChars = searchTerm.replace(/[^a-zA-Z0-9 ]/g, "");

    const searchResults = await Note.find({
      $or: [
        { title: { $regex: new RegExp(searchNoSpecialChars, "i") } },
        { body: { $regex: new RegExp(searchNoSpecialChars, "i") } },
      ],
    }).where({ user: req.user.id });

    res.render("dashboard/search", {
      searchResults,
      layout: "../views/layouts/dashboard",
    });
  } catch (error) {
    console.log(error);
  }
};
