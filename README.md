# jquery.image-loupe
A touchable image magnifyer plug-in for smart devices.

# Usage

## Load scripts to the page
```html
<script src="jquery-1.11.3.min.js"></script>
<script src="jquery.lateriser.js"></script>
```

## Set attribute for image element
```html
<img src="placeholder.png" data-src="original-image.jpg" width="640" height="480" class="late-riser">
```
You can use your original "placeholder" image.

## Define the plug-in
``` javascript
<script>
  $(function () {
    $('.late-riser').lateRiser();
  });
</script>
```
