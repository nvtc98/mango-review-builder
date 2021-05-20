let session = null;

$(() => {
  session = localStorage.getItem("session");
  if (!session) {
    session = Math.random().toString(36).substring(7);
    localStorage.setItem("session", session);
  }
  $(".session").val(session);
  console.log("session", session);

  $.ajax({
    url: "/get-csv-data",
    type: "POST",
    data: { session },
    success: function (result) {
      if (!result) {
        return;
      }
      history.pushState({}, null, window.location.origin);
      $("#uploadCSVForm").hide();
      $("#anotherCSV").show();
      $("#anotherCSVBtn").click(() => {
        $("#uploadCSVForm").slideToggle("fast");
      });
      $("#select").show();

      let listContent = "";
      result.forEach((x) => {
        listContent += `<input type="radio" id="video-${x}" class="videoSelect" name="videoSelect" value="${x}" required><label for="video-${x}">${x}</label><br>`;
      });
      $("#list").html(listContent + "");
    },
  });

  $("#processVideoBtn").click(() => {
    const value = $(".videoSelect:checked").val();
    $.ajax({
      url: "/process",
      type: "POST",
      data: { session, videoSelect: value },
      success: function () {
        $("#progress-container").show();
        trackProgress();
      },
    });
  });

  const trackProgress = () => {
    let interval;
    const ajax = () => {
      $.ajax({
        url: "/get-progress",
        type: "POST",
        data: { session },
        success: function (result) {
          console.log("progress", result);
          if (result.indexOf("%") === -1) {
            clearInterval(interval);
            $("#container").html(
              `Process finished. <a href="${result}" target="_blank">Download video</a><br><a href="/">Back</a>`
            );
          }
          $("#progress").html(result);
        },
      });
    };

    interval = setInterval(() => {
      ajax();
    }, 500);
  };
});
