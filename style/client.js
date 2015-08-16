$(document).ready(function() {
    $('#sea_but').click(function() {
        checkFile();
    });
    $('#num_file').keypress(function(event) {
        var keyCode = event.keyCode ? event.keyCode : event.charCode ? event.charCode : event.which ? event.which : void 0;
        if(keyCode === 13) {
            checkFile();
        }
    });
    function checkFile() {
        var file_num = $('#num_file').val();
        var re = new RegExp('^[0-9]{1,}$');
        if(re.test(file_num)) {
            window.location.replace("/file/" + file_num);
        }
        else {
            $('#num_file').val('');
            $('#num_file').css('border', '2px solid red');
            $('#num_file').attr('placeholder', 'Только цифры!');
        }
    };
    $('#file_link').click(function() {
        $('#file_link').select();
    });
});