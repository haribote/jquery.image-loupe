# jquery.image-loupe
A touchable image magnifyer plug-in for smart devices.

# Usage

## Load scripts to the page
```html
<script src="jquery-1.11.3.min.js"></script>
<script src="jquery.loupe.js"></script>
```

## Markup image
```html
<div class="container">
  <p>
    <img src="image.jpg" alt="" width="720" height="1280" class="js-loupe">
  </p>
</div>
```

## Styles
```css
.container p {
  overflow: hidden;
  text-align: center;
}
.container img {
  opacity: 0;
  transition: opacity .4s ease;
  transform-origin: 50% 50%;
  pointer-events: none;
}
.container img.is-active {
  opacity: 1;
  pointer-events: all;
}
```

## Define the plug-in
``` javascript
<script>
  $(function () {
    $('.late-loupe').loupe();
  });
</script>
```
