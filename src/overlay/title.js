const $ = require('jquery');
const event = require('minivents');

module.exports = parent => {
  const api = {};

  const container = $('<div/>')
    .css({
      position: 'absolute',
      height: '100%',
      width: '100%',
      margin: 0,
      padding: 0,
      top: 0,
      left: 0,
      textAlign: 'center',
    });
  $(parent).append(container);

  const title = $('<div/>')
    .css({
      fontSize: '150px',
      textShadow: '-5px 5px 0 #3774c4',
    })
    .text('Missileman')
    .hide();
  $(container).append(title);

  const press = $('<div/>')
    .css({
      fontSize: '50px',
      textShadow: '-2px 2px 0 #3774c4',
      paddingTop: '350px',
    })
    .text('press space to start')
    .hide();
  $(container).append(press);

  const onKey = ev => {
    if (ev.keyCode === 32) {
      api.emit('start');
    }
  };

  api.show = () => {
    document.body.addEventListener('keydown', onKey);
    title.show();
    press.show();
  };

  api.hide = () => {
    document.body.removeEventListener('keydown', onKey);
    title.hide();
    press.hide();
  };

  event(api);
  return api;
};
