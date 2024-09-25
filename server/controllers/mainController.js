
exports.homepage = async (req, res) => {
 
  res.render('index', {
    layout: '../views/layouts/front-page'
  });
}

